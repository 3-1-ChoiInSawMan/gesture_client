"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import axios from "axios";
import { getCookie, setCookie } from "@/lib/cookie";
import { userApi } from "@/api/userApi";
import { Participant } from "./types";

const RAW_URL =
  process.env.NEXT_PUBLIC_WEBRTC_WS_URL ?? "ws://3.35.173.178:8080/calls";

function getSocketUrl(): string {
  // HTTPS 환경: Mixed Content 방지 — 같은 origin + /calls namespace (Vercel rewrite 경유)
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    return `${window.location.origin}/calls`;
  }
  return RAW_URL.replace(/^ws:\/\//, "http://").replace(/^wss:\/\//, "https://");
}

function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64));
  } catch {
    return null;
  }
}

async function getFreshToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("accessToken");
  if (!token) return null;

  const payload = parseJwt(token);
  const exp = typeof payload?.exp === "number" ? payload.exp : null;
  if (exp && exp > Date.now() / 1000 + 30) return token;

  const refreshToken = getCookie("refreshToken");
  if (!refreshToken) return token;

  try {
    const BASE_URL = window.location.protocol === "https:" ? "/api/v1" : (process.env.NEXT_PUBLIC_API_URL ?? "");
    const { data } = await axios.get(`${BASE_URL}/auth/refresh`, {
      headers: { Authorization: `Bearer ${refreshToken}` },
    });
    const newAccess: string = data.data.accessToken;
    const newRefresh: string = data.data.refreshToken;
    localStorage.setItem("accessToken", newAccess);
    setCookie("refreshToken", newRefresh);
    return newAccess;
  } catch {
    // refresh 실패 시 기존 토큰으로 시도
  }
  return token;
}

/** ICE gathering 완료까지 대기 (최대 timeoutMs, 기본 5초) */
function waitForIceGathering(pc: RTCPeerConnection, timeoutMs = 5000): Promise<void> {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === "complete") { resolve(); return; }
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    const timer = setTimeout(finish, timeoutMs);
    pc.addEventListener("icegatheringstatechange", () => {
      if (pc.iceGatheringState === "complete") { clearTimeout(timer); finish(); }
    });
  });
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  {
    urls: "turn:openrelay.metered.ca:80",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  {
    urls: "turn:openrelay.metered.ca:443?transport=tcp",
    username: "openrelayproject",
    credential: "openrelayproject",
  },
];

interface PeerEntry {
  pc: RTCPeerConnection;
  stream: MediaStream;       // 카메라 + 오디오
  screenStream: MediaStream; // 화면 공유
  userIdx?: number;
  videoSender?: RTCRtpSender;
  audioSender?: RTCRtpSender;
  screenSender?: RTCRtpSender;
  dc?: RTCDataChannel;       // P2P 상태 시그널링 (서버 불필요)
  /** 초기 offer/answer 완료 전까지 onnegotiationneeded 억제 */
  readyForRenegotiation: boolean;
}

export function useWebRTC(params: {
  roomId: string;
  userId: string;
  nickname: string;
  localVideoStream: MediaStream | null;
  localAudioStream: MediaStream | null;
  screenStream?: MediaStream | null;
  isSpeaking?: boolean;
  onCaption?: (name: string, text: string) => void;
  onTranslation?: (text: string) => void;
}) {
  const { roomId, userId, nickname, localVideoStream, localAudioStream, screenStream, isSpeaking, onCaption, onTranslation } = params;
  const [remoteParticipants, setRemoteParticipants] = useState<Participant[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<Map<string, PeerEntry>>(new Map());
  const videoStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const myIdRef = useRef<string>(userId);
  const profileCache = useRef<Map<number, { name: string; username: string }>>(new Map());

  videoStreamRef.current = localVideoStream;
  audioStreamRef.current = localAudioStream;
  screenStreamRef.current = screenStream ?? null;
  const isSpeakingRef = useRef<boolean>(false);
  isSpeakingRef.current = isSpeaking ?? false;
  const nicknameRef = useRef<string>(nickname);
  nicknameRef.current = nickname;
  const onCaptionRef = useRef<typeof onCaption>(onCaption);
  onCaptionRef.current = onCaption;
  const onTranslationRef = useRef<typeof onTranslation>(onTranslation);
  onTranslationRef.current = onTranslation;

  const roomIdx = Number(roomId);

  const getProfile = useCallback(async (userIdx: number): Promise<{ name: string; username: string }> => {
    const cached = profileCache.current.get(userIdx);
    if (cached) return cached;
    try {
      const profile = await userApi.getUser(String(userIdx));
      const result = {
        name: profile.nickname || profile.id || `사용자 ${userIdx}`,
        username: profile.id || profile.userId || String(userIdx),
      };
      profileCache.current.set(userIdx, result);
      return result;
    } catch {
      return { name: `사용자 ${userIdx}`, username: String(userIdx) };
    }
  }, []);

  /**
   * RTCPeerConnection 생성 및 이벤트 핸들러만 설정.
   * 트랜시버/트랙 추가는 호출부(offerer/answerer)에서 담당.
   */
  const createPeer = useCallback(
    (peerId: string): RTCPeerConnection => {
      const remoteStream = new MediaStream();
      const remoteScreenStream = new MediaStream();
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      const entry: PeerEntry = {
        pc,
        stream: remoteStream,
        screenStream: remoteScreenStream,
        readyForRenegotiation: false,
      };
      peersRef.current.set(peerId, entry);

      pc.ontrack = (e) => {
        if (e.track.kind === "video") {
          // 첫 번째 video track = 카메라, 두 번째 = 화면 공유
          const isScreenTrack = remoteStream.getVideoTracks().length > 0;

          if (!isScreenTrack) {
            // ── 카메라 트랙 ──
            if (!remoteStream.getTrackById(e.track.id)) remoteStream.addTrack(e.track);
            const initiallyMuted = e.track.muted;
            e.track.onmute = () =>
              setRemoteParticipants((prev) =>
                prev.map((p) => (p.id === peerId ? { ...p, isCameraOff: true } : p))
              );
            e.track.onunmute = () =>
              setRemoteParticipants((prev) =>
                prev.map((p) => (p.id === peerId ? { ...p, isCameraOff: false } : p))
              );
            setRemoteParticipants((prev) =>
              prev.map((p) =>
                p.id === peerId
                  ? { ...p, stream: remoteStream, isCameraOff: initiallyMuted }
                  : p
              )
            );
          } else {
            // ── 화면 공유 트랙 ──
            // isScreenSharing은 screen_share_start/stop 소켓 이벤트로만 제어
            // (onunmute 기반 감지는 브라우저마다 muted 초기값이 달라 오작동 유발)
            if (!remoteScreenStream.getTrackById(e.track.id))
              remoteScreenStream.addTrack(e.track);
            // 소켓 이벤트 유실 대비 fallback: 트랙이 mute되면 화면 공유 종료 처리
            e.track.onmute = () =>
              setRemoteParticipants((prev) =>
                prev.map((p) => (p.id === peerId ? { ...p, isScreenSharing: false } : p))
              );
            setRemoteParticipants((prev) =>
              prev.map((p) =>
                p.id === peerId ? { ...p, screenStream: remoteScreenStream } : p
              )
            );
          }
        } else {
          // ── 오디오 트랙 ──
          if (!remoteStream.getTrackById(e.track.id)) remoteStream.addTrack(e.track);
          setRemoteParticipants((prev) =>
            prev.map((p) => (p.id === peerId ? { ...p, stream: remoteStream } : p))
          );
        }
      };

      // 초기 협상 완료 후 트랙 변경 시 재협상 (화면공유 등)
      pc.onnegotiationneeded = async () => {
        if (!entry.readyForRenegotiation || pc.signalingState !== "stable") return;
        try {
          const offer = await pc.createOffer();
          if (pc.signalingState !== "stable") return;
          await pc.setLocalDescription(offer);
          socketRef.current?.emit("offer", {
            callRoomIdx: roomIdx,
            sdp: offer.sdp,
            targetSocketId: peerId,
            userId: myIdRef.current,
          });
        } catch {
          // ignore
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          console.log("[WebRTC] onicecandidate →", e.candidate.type, e.candidate.candidate?.slice(10, 70));
        } else {
          console.log("[WebRTC] onicecandidate → null (gathering complete)");
        }
      };

      pc.onicegatheringstatechange = () => {
        console.log("[WebRTC] ICE gathering", peerId, "→", pc.iceGatheringState);
      };

      pc.oniceconnectionstatechange = () => {
        console.log("[WebRTC] ICE connection", peerId, "→", pc.iceConnectionState);
      };

      pc.onconnectionstatechange = () => {
        console.log("[WebRTC] connection", peerId, "→", pc.connectionState);
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected"
        ) {
          peersRef.current.delete(peerId);
          setRemoteParticipants((prev) => prev.filter((p) => p.id !== peerId));
        }
      };

      return pc;
    },
    [roomIdx]
  );

  // 카메라/마이크/화면공유 on/off 시 각 sender에 replaceTrack (재협상 불필요)
  // 트랙이 실제로 바뀐 경우에만 호출 — 불필요한 재전송으로 인한 원격 측 mute/unmute 방지
  useEffect(() => {
    const videoTrack = localVideoStream?.getVideoTracks()[0] ?? null;
    const audioTrack = localAudioStream?.getAudioTracks()[0] ?? null;
    const screenTrack = screenStream?.getVideoTracks()[0] ?? null;

    peersRef.current.forEach((entry) => {
      if (entry.videoSender && entry.videoSender.track !== videoTrack)
        entry.videoSender.replaceTrack(videoTrack).catch(() => {});
      if (entry.audioSender && entry.audioSender.track !== audioTrack)
        entry.audioSender.replaceTrack(audioTrack).catch(() => {});
      if (entry.screenSender && entry.screenSender.track !== screenTrack)
        entry.screenSender.replaceTrack(screenTrack).catch(() => {});
    });
  }, [screenStream, localVideoStream, localAudioStream]);

  // 화면 공유 시작/종료 시 연결된 모든 피어에게 시그널 전송
  useEffect(() => {
    const s = socketRef.current;
    if (!s?.connected) return;
    const event = screenStream ? "screen_share_start" : "screen_share_stop";
    peersRef.current.forEach((_, peerId) => {
      s.emit(event, { callRoomIdx: roomIdx, targetSocketId: peerId });
    });
  }, [screenStream, roomIdx]);

  // 카메라 on/off 시 DataChannel(P2P)로 상태 전송 — 서버 포워딩 불필요
  useEffect(() => {
    const msg = JSON.stringify({ type: localVideoStream ? "camera_on" : "camera_off" });
    peersRef.current.forEach((entry) => {
      if (entry.dc?.readyState === "open") entry.dc.send(msg);
    });
  }, [localVideoStream]);

  // 화면 공유 시작/종료 시 DataChannel(P2P)로 상태 전송
  useEffect(() => {
    const msg = JSON.stringify({ type: screenStream ? "screen_on" : "screen_off" });
    peersRef.current.forEach((entry) => {
      if (entry.dc?.readyState === "open") entry.dc.send(msg);
    });
  }, [screenStream]);

  // 발화 상태 변경 시 DataChannel(P2P)로 전송
  useEffect(() => {
    const msg = JSON.stringify({ type: isSpeaking ? "speaking_on" : "speaking_off" });
    peersRef.current.forEach((entry) => {
      if (entry.dc?.readyState === "open") entry.dc.send(msg);
    });
  }, [isSpeaking]);

  useEffect(() => {
    if (!roomId || !userId) return;

    let cancelled = false;

    getFreshToken().then((token) => {
      if (cancelled) return;

      const payload = token ? parseJwt(token) : null;
      const myId = (payload?.sub as string | undefined) ?? userId;
      myIdRef.current = myId;

      const socket = io(getSocketUrl(), {
        auth: { token: token ?? "" },
        transports: ["websocket"],
      });
      socketRef.current = socket;

      // DataChannel 설정 헬퍼 — 카메라/화면공유 상태를 P2P로 직접 전달 (서버 불필요)
      const setupDC = (dc: RTCDataChannel, peerId: string) => {
        const e = peersRef.current.get(peerId);
        if (e) e.dc = dc;
        dc.onopen = () => {
          // 연결 시 현재 상태 일괄 전송
          if (videoStreamRef.current) dc.send(JSON.stringify({ type: "camera_on" }));
          if (screenStreamRef.current) dc.send(JSON.stringify({ type: "screen_on" }));
          if (isSpeakingRef.current) dc.send(JSON.stringify({ type: "speaking_on" }));
        };
        dc.onmessage = (ev) => {
          try {
            const msg: { type: string; text?: string; name?: string } = JSON.parse(ev.data as string);
            if (msg.type === "camera_on") {
              setRemoteParticipants((prev) =>
                prev.map((p) => (p.id === peerId ? { ...p, isCameraOff: false } : p))
              );
            } else if (msg.type === "camera_off") {
              setRemoteParticipants((prev) =>
                prev.map((p) => (p.id === peerId ? { ...p, isCameraOff: true } : p))
              );
            } else if (msg.type === "screen_on") {
              setRemoteParticipants((prev) =>
                prev.map((p) => (p.id === peerId ? { ...p, isScreenSharing: true } : p))
              );
            } else if (msg.type === "screen_off") {
              setRemoteParticipants((prev) =>
                prev.map((p) => (p.id === peerId ? { ...p, isScreenSharing: false } : p))
              );
            } else if (msg.type === "speaking_on") {
              setRemoteParticipants((prev) =>
                prev.map((p) => (p.id === peerId ? { ...p, isSpeaking: true } : p))
              );
            } else if (msg.type === "speaking_off") {
              setRemoteParticipants((prev) =>
                prev.map((p) => (p.id === peerId ? { ...p, isSpeaking: false } : p))
              );
            } else if (msg.type === "caption" && typeof msg.text === "string") {
              onCaptionRef.current?.(msg.name ?? peerId, msg.text);
            }
          } catch {}
        };
      };

      socket.on("connect", () => {
        socket.emit("join_call", {
          callRoomIdx: roomIdx,
          userId: myId,
          token: token ?? "",
        });
      });

      // 새 참여자 입장 — offer 전송 (offerer 역할)
      socket.on(
        "user_joined",
        async (data: { socketId?: string; userIdx?: number }) => {
          const peerId = data.socketId;
          if (!peerId) return;

          if (data.userIdx !== undefined) {
            peersRef.current.forEach((entry, oldId) => {
              if (entry.userIdx === data.userIdx && oldId !== peerId) {
                entry.pc.close();
                peersRef.current.delete(oldId);
              }
            });
          }

          // 기존 peer면 프로필만 업데이트
          const existingEntry = peersRef.current.get(peerId);
          if (existingEntry) {
            existingEntry.userIdx = data.userIdx;
            const profile =
              data.userIdx !== undefined
                ? await getProfile(data.userIdx)
                : { name: peerId, username: peerId };
            setRemoteParticipants((prev) => {
              const withoutStale =
                data.userIdx !== undefined
                  ? prev.filter(
                      (p) => p.userIdx !== data.userIdx || p.id === peerId
                    )
                  : prev;
              return withoutStale.map((p) =>
                p.id === peerId
                  ? { ...p, name: profile.name, username: profile.username, userIdx: data.userIdx }
                  : p
              );
            });
            return;
          }

          // peer를 await 전에 먼저 생성 — ICE 후보 도착 시 drop 방지
          const pc = createPeer(peerId);
          const entry = peersRef.current.get(peerId)!;
          entry.userIdx = data.userIdx;

          // video(카메라) / audio / video(화면공유) 트랜시버를 초기에 모두 추가
          // → SDP에 m= 라인 3개 포함 → 재협상 없이 replaceTrack만으로 화면공유 가능
          const videoTransceiver = pc.addTransceiver("video", { direction: "sendrecv" });
          const audioTransceiver = pc.addTransceiver("audio", { direction: "sendrecv" });
          const screenTransceiver = pc.addTransceiver("video", { direction: "sendrecv" });
          entry.videoSender = videoTransceiver.sender;
          entry.audioSender = audioTransceiver.sender;
          entry.screenSender = screenTransceiver.sender;

          // DataChannel: offer에 포함되어 상대방이 ondatachannel로 수신
          setupDC(pc.createDataChannel("state"), peerId);

          // 현재 켜진 트랙이 있으면 즉시 전송
          const videoTrack = videoStreamRef.current?.getVideoTracks()[0];
          const audioTrack = audioStreamRef.current?.getAudioTracks()[0];
          const screenTrack = screenStreamRef.current?.getVideoTracks()[0];
          if (videoTrack) videoTransceiver.sender.replaceTrack(videoTrack).catch(() => {});
          if (audioTrack) audioTransceiver.sender.replaceTrack(audioTrack).catch(() => {});
          if (screenTrack) screenTransceiver.sender.replaceTrack(screenTrack).catch(() => {});

          // Non-trickle ICE: gathering 완료 후 모든 candidate가 포함된 SDP 전송
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await waitForIceGathering(pc);
          console.log("[WebRTC] offer gathered, sending complete SDP");
          socket.emit("offer", {
            callRoomIdx: roomIdx,
            sdp: pc.localDescription!.sdp,
            targetSocketId: peerId,
            userId: myId,
          });

          // 현재 화면 공유 중이면 새 피어에게도 알림
          if (screenStreamRef.current) {
            socket.emit("screen_share_start", { callRoomIdx: roomIdx, targetSocketId: peerId });
          }
          if (videoStreamRef.current) {
            socket.emit("camera_on", { callRoomIdx: roomIdx, targetSocketId: peerId });
          }

          // 프로필(닉네임+아이디)은 offer 전송 후 비동기로 fetch
          const profile =
            data.userIdx !== undefined
              ? await getProfile(data.userIdx)
              : { name: peerId, username: peerId };

          setRemoteParticipants((prev) => {
            const withoutStale =
              data.userIdx !== undefined
                ? prev.filter((p) => p.userIdx !== data.userIdx)
                : prev;
            if (withoutStale.find((p) => p.id === peerId)) {
              return withoutStale.map((p) =>
                p.id === peerId ? { ...p, name: profile.name, username: profile.username } : p
              );
            }
            return [
              ...withoutStale,
              {
                id: peerId,
                name: profile.name,
                username: profile.username,
                userIdx: data.userIdx,
                isCameraOff: true,
                isMuted: true,
              },
            ];
          });
        }
      );

      // offer 수신 → answer 전송 (answerer 역할)
      socket.on(
        "offer",
        async (data: {
          fromSocketId?: string;
          fromUserIdx?: number;
          sdp?: string;
        }) => {
          const peerId = data.fromSocketId;
          if (!peerId || !data.sdp) return;
          const userIdx = data.fromUserIdx;

          if (userIdx !== undefined) {
            peersRef.current.forEach((entry, oldId) => {
              if (entry.userIdx === userIdx && oldId !== peerId) {
                entry.pc.close();
                peersRef.current.delete(oldId);
              }
            });
          }

          // peer를 await 전에 즉시 생성 — offerer ICE 후보가 수십ms 내에 도착하므로 drop 방지
          let pc = peersRef.current.get(peerId)?.pc;
          if (!pc) {
            pc = createPeer(peerId);
            // 닉네임은 나중에 업데이트 — 일단 placeholder로 추가
            setRemoteParticipants((prev) => {
              const withoutStale =
                userIdx !== undefined
                  ? prev.filter((p) => p.userIdx !== userIdx)
                  : prev;
              if (withoutStale.find((p) => p.id === peerId)) return withoutStale;
              return [
                ...withoutStale,
                {
                  id: peerId,
                  name: peerId,
                  username: peerId,
                  userIdx,
                  isCameraOff: true,
                  isMuted: true,
                },
              ];
            });
          }

          const entry = peersRef.current.get(peerId)!;
          entry.userIdx = userIdx;

          // answerer는 ondatachannel로 DataChannel 수신
          pc.ondatachannel = (e) => setupDC(e.channel, peerId);

          // setRemoteDescription도 닉네임 fetch 전에 수행 — ICE 후보 버퍼링 가능하게
          await pc.setRemoteDescription({ type: "offer", sdp: data.sdp });

          // offerer의 트랜시버에서 sender 추출 + direction을 sendrecv로 명시
          // video 순서: 첫 번째 = 카메라, 두 번째 = 화면공유
          const videoTransceivers: RTCRtpTransceiver[] = [];
          for (const transceiver of pc.getTransceivers()) {
            transceiver.direction = "sendrecv";
            if (transceiver.receiver.track.kind === "video") {
              videoTransceivers.push(transceiver);
            } else if (transceiver.receiver.track.kind === "audio") {
              entry.audioSender = transceiver.sender;
            }
          }
          entry.videoSender = videoTransceivers[0]?.sender;
          entry.screenSender = videoTransceivers[1]?.sender;

          const videoTrack = videoStreamRef.current?.getVideoTracks()[0];
          const audioTrack = audioStreamRef.current?.getAudioTracks()[0];
          const screenTrack = screenStreamRef.current?.getVideoTracks()[0];
          if (entry.videoSender) entry.videoSender.replaceTrack(videoTrack ?? null).catch(() => {});
          if (entry.audioSender) entry.audioSender.replaceTrack(audioTrack ?? null).catch(() => {});
          if (entry.screenSender) entry.screenSender.replaceTrack(screenTrack ?? null).catch(() => {});

          const answer = await pc.createAnswer();
          console.log("[WebRTC] answer video dir:", answer.sdp?.match(/m=video[\s\S]*?a=(sendrecv|recvonly|sendonly|inactive)/)?.[1]);
          await pc.setLocalDescription(answer);
          // Non-trickle ICE: gathering 완료 후 모든 candidate가 포함된 SDP 전송
          await waitForIceGathering(pc);
          console.log("[WebRTC] answer gathered, sending complete SDP");
          socket.emit("answer", {
            callRoomIdx: roomIdx,
            sdp: pc.localDescription!.sdp,
            targetSocketId: peerId,
            userId: myId,
          });
          entry.readyForRenegotiation = true;

          // 현재 화면 공유/카메라 상태를 오퍼러에게도 알림
          if (screenStreamRef.current) {
            socket.emit("screen_share_start", { callRoomIdx: roomIdx, targetSocketId: peerId });
          }
          if (videoStreamRef.current) {
            socket.emit("camera_on", { callRoomIdx: roomIdx, targetSocketId: peerId });
          }

          // 프로필(닉네임+아이디)은 WebRTC 협상 완료 후 fetch
          const profile =
            userIdx !== undefined ? await getProfile(userIdx) : { name: peerId, username: peerId };
          setRemoteParticipants((prev) =>
            prev.map((p) =>
              p.id === peerId ? { ...p, name: profile.name, username: profile.username, userIdx } : p
            )
          );
        }
      );

      // answer 수신 → 초기 협상 완료
      socket.on(
        "answer",
        async (data: {
          fromSocketId?: string;
          fromUserIdx?: number;
          sdp?: string;
        }) => {
          const peerId = data.fromSocketId;
          console.log("[WebRTC] answer event — fromSocketId:", peerId, "| peer exists:", !!peersRef.current.get(peerId!));
          if (!peerId || !data.sdp) return;
          const peer = peersRef.current.get(peerId);
          if (peer) {
            try {
              await peer.pc.setRemoteDescription({ type: "answer", sdp: data.sdp });
              console.log("[WebRTC] setRemoteDescription(answer) OK — signalingState:", peer.pc.signalingState, "iceState:", peer.pc.iceConnectionState);
              peer.readyForRenegotiation = true;
            } catch (e) {
              console.error("[WebRTC] setRemoteDescription(answer) FAILED:", e);
            }
          } else {
            console.warn("[WebRTC] answer received but no peer found for", peerId);
          }
        }
      );

      // ICE candidate 수신 (서버가 trickle ICE를 지원할 경우 사용)
      socket.on(
        "candidate",
        async (data: {
          fromSocketId?: string;
          candidate?: string;
          sdpMid?: string | null;
          sdpMLineIndex?: number | null;
        }) => {
          const peerId = data.fromSocketId;
          if (!peerId || !data.candidate) return;
          const peer = peersRef.current.get(peerId);
          if (peer) {
            await peer.pc
              .addIceCandidate({
                candidate: data.candidate,
                sdpMid: data.sdpMid ?? null,
                sdpMLineIndex: data.sdpMLineIndex ?? null,
              })
              .catch(() => {});
          }
        }
      );

      // 화면 공유 시작/종료 수신
      socket.on("screen_share_start", (data: { fromSocketId?: string }) => {
        const peerId = data.fromSocketId;
        if (!peerId) return;
        setRemoteParticipants((prev) =>
          prev.map((p) => (p.id === peerId ? { ...p, isScreenSharing: true } : p))
        );
      });

      socket.on("screen_share_stop", (data: { fromSocketId?: string }) => {
        const peerId = data.fromSocketId;
        if (!peerId) return;
        setRemoteParticipants((prev) =>
          prev.map((p) => (p.id === peerId ? { ...p, isScreenSharing: false } : p))
        );
      });

      // 카메라 on/off 수신
      socket.on("camera_on", (data: { fromSocketId?: string }) => {
        const peerId = data.fromSocketId;
        if (!peerId) return;
        setRemoteParticipants((prev) =>
          prev.map((p) => (p.id === peerId ? { ...p, isCameraOff: false } : p))
        );
      });

      socket.on("camera_off", (data: { fromSocketId?: string }) => {
        const peerId = data.fromSocketId;
        if (!peerId) return;
        setRemoteParticipants((prev) =>
          prev.map((p) => (p.id === peerId ? { ...p, isCameraOff: true } : p))
        );
      });

      // 수어 자막 번역 결과
      socket.on("translation", (data: { text?: string }) => {
        if (data.text) onTranslationRef.current?.(data.text);
      });

      // 참여자 퇴장
      socket.on("leave", (data: { socketId?: string }) => {
        const peerId = data.socketId;
        if (!peerId) return;
        const peer = peersRef.current.get(peerId);
        if (peer) {
          peer.pc.close();
          peersRef.current.delete(peerId);
        }
        setRemoteParticipants((prev) => prev.filter((p) => p.id !== peerId));
      });
    }); // getFreshToken().then

    return () => {
      cancelled = true;
      const s = socketRef.current;
      if (s) {
        s.emit("leave", { callRoomIdx: roomIdx });
        s.disconnect();
        socketRef.current = null;
      }
      peersRef.current.forEach(({ pc }) => pc.close());
      peersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId]);

  const sendCaption = useCallback((text: string) => {
    const msg = JSON.stringify({ type: "caption", name: nicknameRef.current, text });
    peersRef.current.forEach((entry) => {
      if (entry.dc?.readyState === "open") entry.dc.send(msg);
    });
  }, []);

  const sendFrame = useCallback((frames: number[][]) => {
    socketRef.current?.emit("send_frame", { callRoomIdx: roomIdx, frame: frames });
  }, [roomIdx]);

  return { remoteParticipants, sendCaption, sendFrame };
}
