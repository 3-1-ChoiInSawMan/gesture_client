"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { refreshAccessToken } from "@/api/axiosInstance";
import { userApi } from "@/api/userApi";
import { Participant } from "./types";

const RAW_URL =
  process.env.NEXT_PUBLIC_WEBRTC_WS_URL ?? "ws://3.35.173.178:8080/calls";

function getSocketUrl(): string {
  // HTTPS ?섍꼍: Mixed Content 諛⑹? ??媛숈? origin + /calls namespace (Vercel rewrite 寃쎌쑀)
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

  try {
    return await refreshAccessToken();
  } catch {
    // refresh ?ㅽ뙣 ??湲곗〈 ?좏겙?쇰줈 ?쒕룄
  }
  return token;
}

/** ICE gathering ?꾨즺源뚯? ?湲?(理쒕? timeoutMs, 湲곕낯 5珥? */
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
  stream: MediaStream;       // 移대찓??+ ?ㅻ뵒??
  screenStream: MediaStream; // ?붾㈃ 怨듭쑀
  userIdx?: number;
  videoSender?: RTCRtpSender;
  audioSender?: RTCRtpSender;
  screenSender?: RTCRtpSender;
  dc?: RTCDataChannel;       // P2P ?곹깭 ?쒓렇?먮쭅 (?쒕쾭 遺덊븘??
  /** 珥덇린 offer/answer ?꾨즺 ?꾧퉴吏 onnegotiationneeded ?듭젣 */
  readyForRenegotiation: boolean;
  lastRemoteOfferSdp?: string;
  lastRemoteAnswerSdp?: string;
  applyingRemoteAnswer: boolean;
}

interface CallPeerInfo {
  socketId?: string;
  fromSocketId?: string;
  targetSocketId?: string;
  userIdx?: number;
  nickname?: string;
}

type AnswerPayload = {
  targetSocketId?: string;
  fromSocketId?: string;
  fromUserIdx?: number;
  fromNickname?: string;
  nickname?: string;
  userId?: string;
  sdp?: string;
};

const getMLineSignature = (sdp?: string) =>
  (sdp ?? "")
    .split("\r\n")
    .filter((line) => line.startsWith("m="))
    .map((line) => line.split(" ")[0])
    .join("|");

const isFallbackProfile = (
  profile: { name: string; username: string },
  peerId: string,
  userIdx?: number
) =>
  profile.name === peerId ||
  profile.name === "Unknown" ||
  profile.name === `User ${userIdx}` ||
  profile.username === peerId ||
  profile.username === "unknown";

export function useWebRTC(params: {
  roomId: string;
  userId: string;
  nickname: string;
  localVideoStream: MediaStream | null;
  localAudioStream: MediaStream | null;
  screenStream?: MediaStream | null;
  isSpeaking?: boolean;
  onCaption?: (name: string, text: string) => void;
  onSpeechCaption?: (name: string, text: string) => void;
  onTranslation?: (text: string) => void;
  onRoomDeleted?: () => void;
  onCallJoined?: (callIdx: number) => void;
}) {
  const { roomId, userId, nickname, localVideoStream, localAudioStream, screenStream, isSpeaking, onCaption, onSpeechCaption, onTranslation, onRoomDeleted, onCallJoined } = params;
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
  const isMicOnRef = useRef<boolean>(false);
  isMicOnRef.current = !!localAudioStream;
  const nicknameRef = useRef<string>(nickname);
  nicknameRef.current = nickname;
  const onCaptionRef = useRef<typeof onCaption>(onCaption);
  onCaptionRef.current = onCaption;
  const onSpeechCaptionRef = useRef<typeof onSpeechCaption>(onSpeechCaption);
  onSpeechCaptionRef.current = onSpeechCaption;
  const onTranslationRef = useRef<typeof onTranslation>(onTranslation);
  onTranslationRef.current = onTranslation;
  const onRoomDeletedRef = useRef<typeof onRoomDeleted>(onRoomDeleted);
  onRoomDeletedRef.current = onRoomDeleted;
  const onCallJoinedRef = useRef<typeof onCallJoined>(onCallJoined);
  onCallJoinedRef.current = onCallJoined;

  const roomIdx = Number(roomId);

  const getProfile = useCallback(async (userIdx: number): Promise<{ name: string; username: string }> => {
    const cached = profileCache.current.get(userIdx);
    if (cached) return cached;
    try {
      const profile = await userApi.getUser(String(userIdx));
      const result = {
        name: profile.nickname || profile.id || `User ${userIdx}`,
        username: profile.id || profile.userId || String(userIdx),
      };
      profileCache.current.set(userIdx, result);
      return result;
    } catch {
      return { name: `User ${userIdx}`, username: String(userIdx) };
    }
  }, []);

  const closePeer = useCallback((peerId: string) => {
    const entry = peersRef.current.get(peerId);
    if (entry) {
      entry.pc.close();
      peersRef.current.delete(peerId);
    }
    setRemoteParticipants((prev) => prev.filter((p) => p.id !== peerId));
  }, []);

  const detachPeerConnection = useCallback((peerId: string) => {
    const entry = peersRef.current.get(peerId);
    if (entry) {
      entry.pc.close();
      peersRef.current.delete(peerId);
    }
    setRemoteParticipants((prev) =>
      prev.map((p) =>
        p.id === peerId
          ? {
              ...p,
              stream: undefined,
              screenStream: undefined,
              isCameraOff: true,
              isMuted: true,
              isSpeaking: false,
              isScreenSharing: false,
            }
          : p
      )
    );
  }, []);

  const closeAllPeers = useCallback(() => {
    peersRef.current.forEach(({ pc }) => pc.close());
    peersRef.current.clear();
  }, []);

  const closeStalePeersForUser = useCallback((userIdx: number, keepPeerId: string) => {
    peersRef.current.forEach((entry, oldId) => {
      const isTerminal =
        entry.pc.connectionState === "failed" ||
        entry.pc.connectionState === "closed" ||
        entry.pc.iceConnectionState === "failed" ||
        entry.pc.iceConnectionState === "closed";
      if (entry.userIdx === userIdx && oldId !== keepPeerId && isTerminal) {
        entry.pc.close();
        peersRef.current.delete(oldId);
      }
    });
  }, []);

  const upsertRemoteParticipant = useCallback((
    peerId: string,
    profile: { name: string; username: string },
    userIdx?: number,
    patch: Partial<Participant> = {}
  ) => {
    setRemoteParticipants((prev) => {
      const previousById = prev.find((p) => p.id === peerId);
      const previousByUser =
        userIdx !== undefined ? prev.find((p) => p.userIdx === userIdx) : undefined;
      const previousProfile = previousById ?? previousByUser;
      const keepPreviousProfile =
        previousProfile &&
        !isFallbackProfile(previousProfile, previousProfile.id, previousProfile.userIdx) &&
        isFallbackProfile(profile, peerId, userIdx);
      const displayProfile = keepPreviousProfile
        ? {
            name: previousProfile.name,
            username: previousProfile.username,
          }
        : profile;
      const withoutStale = prev;
      const existing = withoutStale.find((p) => p.id === peerId);
      if (existing) {
        return withoutStale.map((p) =>
          p.id === peerId
            ? {
                ...p,
                ...patch,
                name: displayProfile.name,
                username: displayProfile.username,
                userIdx: userIdx ?? p.userIdx,
              }
            : p
        );
      }
      return [
        ...withoutStale,
        {
          id: peerId,
          name: displayProfile.name,
          username: displayProfile.username,
          userIdx,
          isCameraOff: true,
          isMuted: true,
          ...patch,
        },
      ];
    });
  }, []);

  const refreshPeerProfile = useCallback((peerId: string, userIdx?: number) => {
    if (userIdx === undefined) return;
    getProfile(userIdx)
      .then((profile) => upsertRemoteParticipant(peerId, profile, userIdx))
      .catch(() => {});
  }, [getProfile, upsertRemoteParticipant]);

  const getSocketProfile = useCallback((peer: CallPeerInfo) => {
    const peerId = peer.socketId ?? peer.fromSocketId;
    if (peer.nickname && peer.userIdx !== undefined) {
      const profile = {
        name: peer.nickname,
        username: String(peer.userIdx),
      };
      profileCache.current.set(peer.userIdx, profile);
      return profile;
    }
    if (peer.userIdx !== undefined) {
      return profileCache.current.get(peer.userIdx) ?? {
        name: `User ${peer.userIdx}`,
        username: String(peer.userIdx),
      };
    }
    return {
      name: peerId ?? "Unknown",
      username: peerId ?? "unknown",
    };
  }, []);

  const upsertSocketParticipant = useCallback((
    peer: CallPeerInfo,
    patch: Partial<Participant> = {}
  ) => {
    const peerId = peer.socketId ?? peer.fromSocketId;
    if (!peerId || peerId === socketRef.current?.id) return;
    upsertRemoteParticipant(peerId, getSocketProfile(peer), peer.userIdx, patch);
    if (!peer.nickname) refreshPeerProfile(peerId, peer.userIdx);
  }, [getSocketProfile, refreshPeerProfile, upsertRemoteParticipant]);

  const resolveAnswerPeerId = useCallback((data: AnswerPayload) => {
    if (data.fromSocketId) return data.fromSocketId;
    if (data.fromUserIdx !== undefined) {
      for (const [peerId, entry] of peersRef.current) {
        if (
          entry.userIdx === data.fromUserIdx &&
          entry.pc.signalingState === "have-local-offer" &&
          !entry.applyingRemoteAnswer &&
          entry.lastRemoteAnswerSdp !== data.sdp
        ) {
          return peerId;
        }
      }
    }

    const pendingPeers = Array.from(peersRef.current.entries()).filter(
      ([, entry]) =>
        entry.pc.signalingState === "have-local-offer" &&
        !entry.applyingRemoteAnswer &&
        entry.lastRemoteAnswerSdp !== data.sdp
    );
    return pendingPeers.length === 1 ? pendingPeers[0][0] : undefined;
  }, []);

  /**
   * RTCPeerConnection ?앹꽦 諛??대깽???몃뱾?щ쭔 ?ㅼ젙.
   * ?몃옖?쒕쾭/?몃옓 異붽????몄텧遺(offerer/answerer)?먯꽌 ?대떦.
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
        applyingRemoteAnswer: false,
      };
      peersRef.current.set(peerId, entry);

      pc.ontrack = (e) => {
        if (e.track.kind === "video") {
          // 泥?踰덉㎏ video track = 移대찓?? ??踰덉㎏ = ?붾㈃ 怨듭쑀
          const isScreenTrack =
            e.transceiver?.mid === "2" || remoteStream.getVideoTracks().length > 0;

          if (!isScreenTrack) {
            // ?? 移대찓???몃옓 ??
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
            // ?? ?붾㈃ 怨듭쑀 ?몃옓 ??
            // isScreenSharing? screen_share_start/stop ?뚯폆 ?대깽?몃줈留??쒖뼱
            // (onunmute 湲곕컲 媛먯???釉뚮씪?곗?留덈떎 muted 珥덇린媛믪씠 ?щ씪 ?ㅼ옉???좊컻)
            if (!remoteScreenStream.getTrackById(e.track.id))
              remoteScreenStream.addTrack(e.track);
            // ?뚯폆 ?대깽???좎떎 ?鍮?fallback: ?몃옓??mute?섎㈃ ?붾㈃ 怨듭쑀 醫낅즺 泥섎━
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
          // ?? ?ㅻ뵒???몃옓 ??
          if (!remoteStream.getTrackById(e.track.id)) remoteStream.addTrack(e.track);
          setRemoteParticipants((prev) =>
            prev.map((p) => (p.id === peerId ? { ...p, stream: remoteStream } : p))
          );
        }
      };

      // 珥덇린 ?묒긽 ?꾨즺 ???몃옓 蹂寃????ы삊??(?붾㈃怨듭쑀 ??
      pc.onnegotiationneeded = async () => {
        if (!entry.readyForRenegotiation || pc.signalingState !== "stable") return;
        try {
          const offer = await pc.createOffer();
          if (pc.signalingState !== "stable") return;
          await pc.setLocalDescription(offer);
          await waitForIceGathering(pc);
          socketRef.current?.emit("offer", {
            callRoomIdx: roomIdx,
            sdp: pc.localDescription!.sdp,
            targetSocketId: peerId,
            fromSocketId: socketRef.current.id,
            userId: myIdRef.current,
          });
        } catch {
          // ignore
        }
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          console.log("[WebRTC] onicecandidate", e.candidate.type, e.candidate.candidate?.slice(10, 70));
        } else {
          console.log("[WebRTC] onicecandidate ??null (gathering complete)");
        }
      };

      pc.onicegatheringstatechange = () => {
        console.log("[WebRTC] ICE gathering", peerId, pc.iceGatheringState);
      };

      pc.oniceconnectionstatechange = () => {
        console.log("[WebRTC] ICE connection", peerId, pc.iceConnectionState);
      };

      pc.onconnectionstatechange = () => {
        console.log("[WebRTC] connection", peerId, pc.connectionState);
        // "disconnected"???쇱떆???곹깭 ???쒓굅?섎㈃ 蹂듦뎄 遺덇??ν빐吏誘濡?"failed"留?泥섎━
        if (pc.connectionState === "failed") {
          detachPeerConnection(peerId);
        }
      };

      return pc;
    },
    [detachPeerConnection, roomIdx]
  );

  // 移대찓??留덉씠???붾㈃怨듭쑀 on/off ??媛?sender??replaceTrack (?ы삊??遺덊븘??
  // ?몃옓???ㅼ젣濡?諛붾?寃쎌슦?먮쭔 ?몄텧 ??遺덊븘?뷀븳 ?ъ쟾?≪쑝濡??명븳 ?먭꺽 痢?mute/unmute 諛⑹?
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

  // ?붾㈃ 怨듭쑀 ?쒖옉/醫낅즺 ???곌껐??紐⑤뱺 ?쇱뼱?먭쾶 ?쒓렇???꾩넚
  useEffect(() => {
    const s = socketRef.current;
    if (!s?.connected) return;
    const event = screenStream ? "screen_share_start" : "screen_share_stop";
    peersRef.current.forEach((_, peerId) => {
      s.emit(event, { callRoomIdx: roomIdx, targetSocketId: peerId, fromSocketId: s.id });
    });
  }, [screenStream, roomIdx]);

  // 移대찓??on/off ??DataChannel(P2P)濡??곹깭 ?꾩넚 ???쒕쾭 ?ъ썙??遺덊븘??
  useEffect(() => {
    const s = socketRef.current;
    const event = localVideoStream ? "camera_on" : "camera_off";
    if (s?.connected) {
      peersRef.current.forEach((_, peerId) => {
        s.emit(event, { callRoomIdx: roomIdx, targetSocketId: peerId, fromSocketId: s.id });
      });
    }
    const msg = JSON.stringify({ type: localVideoStream ? "camera_on" : "camera_off" });
    peersRef.current.forEach((entry) => {
      if (entry.dc?.readyState === "open") entry.dc.send(msg);
    });
  }, [localVideoStream, roomIdx]);

  useEffect(() => {
    const s = socketRef.current;
    const event = localAudioStream ? "mic_on" : "mic_off";
    if (s?.connected) {
      peersRef.current.forEach((_, peerId) => {
        s.emit(event, { callRoomIdx: roomIdx, targetSocketId: peerId, fromSocketId: s.id });
      });
    }
    const msg = JSON.stringify({ type: localAudioStream ? "mic_on" : "mic_off" });
    peersRef.current.forEach((entry) => {
      if (entry.dc?.readyState === "open") entry.dc.send(msg);
    });
  }, [localAudioStream, roomIdx]);

  // ?붾㈃ 怨듭쑀 ?쒖옉/醫낅즺 ??DataChannel(P2P)濡??곹깭 ?꾩넚
  useEffect(() => {
    const msg = JSON.stringify({ type: screenStream ? "screen_on" : "screen_off" });
    peersRef.current.forEach((entry) => {
      if (entry.dc?.readyState === "open") entry.dc.send(msg);
    });
  }, [screenStream]);

  // 諛쒗솕 ?곹깭 蹂寃???DataChannel(P2P)濡??꾩넚
  useEffect(() => {
    const s = socketRef.current;
    const event = isSpeaking ? "speaking_on" : "speaking_off";
    if (s?.connected) {
      peersRef.current.forEach((_, peerId) => {
        s.emit(event, { callRoomIdx: roomIdx, targetSocketId: peerId, fromSocketId: s.id });
      });
    }
    const msg = JSON.stringify({ type: isSpeaking ? "speaking_on" : "speaking_off" });
    peersRef.current.forEach((entry) => {
      if (entry.dc?.readyState === "open") entry.dc.send(msg);
    });
  }, [isSpeaking, roomIdx]);

  useEffect(() => {
    if (!roomId || !userId) return;

    let cancelled = false;

    getFreshToken().then((token) => {
      if (cancelled) return;

      const payload = token ? parseJwt(token) : null;
      const myId = (payload?.sub as string | undefined) ?? userId;
      myIdRef.current = myId;

      // HTTPS(Vercel) ?섍꼍: Vercel? WebSocket ?꾨줉??遺덇? ??polling ?몃옖?ㅽ룷???ъ슜
      // HTTP 濡쒖뺄 媛쒕컻: WebSocket 吏곸젒 ?곌껐
      const transports =
        typeof window !== "undefined" && window.location.protocol === "https:"
          ? ["polling"]
          : ["websocket"];

      const socket = io(getSocketUrl(), {
        auth: { token: token ?? "" },
        transports,
      });
      socketRef.current = socket;
      const shouldLogSocket = process.env.NODE_ENV !== "production";

      // DataChannel ?ㅼ젙 ?ы띁 ??移대찓???붾㈃怨듭쑀 ?곹깭瑜?P2P濡?吏곸젒 ?꾨떖 (?쒕쾭 遺덊븘??
      const setupDC = (dc: RTCDataChannel, peerId: string) => {
        const e = peersRef.current.get(peerId);
        if (e) e.dc = dc;
        dc.onopen = () => {
          // ?곌껐 ???꾩옱 ?곹깭 ?쇨큵 ?꾩넚
          dc.send(JSON.stringify({ type: videoStreamRef.current ? "camera_on" : "camera_off" }));
          dc.send(JSON.stringify({ type: isMicOnRef.current ? "mic_on" : "mic_off" }));
          dc.send(JSON.stringify({ type: screenStreamRef.current ? "screen_on" : "screen_off" }));
          dc.send(JSON.stringify({ type: isSpeakingRef.current ? "speaking_on" : "speaking_off" }));
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
            } else if (msg.type === "mic_on") {
              setRemoteParticipants((prev) =>
                prev.map((p) => (p.id === peerId ? { ...p, isMuted: false } : p))
              );
            } else if (msg.type === "mic_off") {
              setRemoteParticipants((prev) =>
                prev.map((p) =>
                  p.id === peerId ? { ...p, isMuted: true, isSpeaking: false } : p
                )
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
            } else if (msg.type === "speech_caption" && typeof msg.text === "string") {
              onSpeechCaptionRef.current?.(msg.name ?? peerId, msg.text);
            }
          } catch {}
        };
      };

      const isPeerConnected = (entry?: PeerEntry) =>
        !!entry &&
        (entry.pc.connectionState === "connected" ||
          entry.pc.iceConnectionState === "connected" ||
          entry.pc.iceConnectionState === "completed");

      const isPeerTerminal = (entry?: PeerEntry) =>
        !!entry &&
        (entry.pc.connectionState === "failed" ||
          entry.pc.connectionState === "closed" ||
          entry.pc.iceConnectionState === "failed" ||
          entry.pc.iceConnectionState === "closed");

      const isSignalForMe = (data: { targetSocketId?: string }) =>
        !data.targetSocketId || data.targetSocketId === socket.id;

      const createOfferForParticipant = async (participant: CallPeerInfo) => {
        const peerId = participant.socketId ?? participant.fromSocketId;
        if (!peerId || peerId === socket.id) return;

        const existingEntry = peersRef.current.get(peerId);
        if (isPeerConnected(existingEntry)) return;
        if (existingEntry && !isPeerTerminal(existingEntry)) return;
        if (existingEntry) detachPeerConnection(peerId);

        const pc = createPeer(peerId);
        const entry = peersRef.current.get(peerId)!;
        if (participant.userIdx !== undefined) entry.userIdx = participant.userIdx;
        upsertSocketParticipant(participant);

        const videoTransceiver = pc.addTransceiver("video", { direction: "sendrecv" });
        const audioTransceiver = pc.addTransceiver("audio", { direction: "sendrecv" });
        const screenTransceiver = pc.addTransceiver("video", { direction: "sendrecv" });
        entry.videoSender = videoTransceiver.sender;
        entry.audioSender = audioTransceiver.sender;
        entry.screenSender = screenTransceiver.sender;

        setupDC(pc.createDataChannel("state"), peerId);

        const videoTrack = videoStreamRef.current?.getVideoTracks()[0];
        const audioTrack = audioStreamRef.current?.getAudioTracks()[0];
        const screenTrack = screenStreamRef.current?.getVideoTracks()[0];
        if (videoTrack) videoTransceiver.sender.replaceTrack(videoTrack).catch(() => {});
        if (audioTrack) audioTransceiver.sender.replaceTrack(audioTrack).catch(() => {});
        if (screenTrack) screenTransceiver.sender.replaceTrack(screenTrack).catch(() => {});

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await waitForIceGathering(pc);
        socket.emit("offer", {
          callRoomIdx: roomIdx,
          sdp: pc.localDescription!.sdp,
          targetSocketId: peerId,
          fromSocketId: socket.id,
          userId: myId,
        });

        if (screenStreamRef.current) {
          socket.emit("screen_share_start", { callRoomIdx: roomIdx, targetSocketId: peerId, fromSocketId: socket.id });
        }
        if (videoStreamRef.current) {
          socket.emit("camera_on", { callRoomIdx: roomIdx, targetSocketId: peerId, fromSocketId: socket.id });
        }
        if (audioStreamRef.current) {
          socket.emit("mic_on", { callRoomIdx: roomIdx, targetSocketId: peerId, fromSocketId: socket.id });
        }
      };

      const handleExistingParticipants = (payload?: {
        participants?: CallPeerInfo[];
        users?: CallPeerInfo[];
        callIdx?: number;
        call?: { callIdx?: number };
      } | CallPeerInfo[]) => {
        if (!Array.isArray(payload)) {
          const callIdx = payload?.callIdx ?? payload?.call?.callIdx;
          if (typeof callIdx === "number" && callIdx > 0) {
            onCallJoinedRef.current?.(callIdx);
          }
        }
        const participants = Array.isArray(payload)
          ? payload
          : payload?.participants ?? payload?.users ?? [];
        participants.forEach((participant) => {
          upsertSocketParticipant(participant);
        });
      };

      socket.on("connect", () => {
        const payload = {
          callRoomIdx: roomIdx,
          userId: myId,
          token: token ?? "",
        };
        if (shouldLogSocket) {
          console.log("[WebRTC] socket connected:", {
            id: socket.id,
            url: getSocketUrl(),
            roomIdx,
          });
          console.log("[WebRTC] emit join_call:", {
            callRoomIdx: payload.callRoomIdx,
            userId: payload.userId,
            hasToken: !!payload.token,
          });
        }
        socket.emit("join_call", payload, handleExistingParticipants);
      });

      socket.on("connect_error", (error) => {
        if (shouldLogSocket) {
          console.error("[WebRTC] socket connect_error:", {
            message: error.message,
            data: (error as Error & { data?: unknown }).data,
          });
        }
      });

      socket.on("disconnect", (reason) => {
        if (shouldLogSocket) {
          console.warn("[WebRTC] socket disconnected:", reason);
        }
      });

      if (shouldLogSocket) {
        socket.onAny((event, ...args) => {
          console.log("[WebRTC] socket event:", event, args[0] ?? "");
        });
      }

      socket.on("existing_participants", handleExistingParticipants);
      socket.on("participants", handleExistingParticipants);
      socket.on("call_participants", handleExistingParticipants);

      // ??李몄뿬???낆옣 ??offer ?꾩넚 (offerer ??븷)
      socket.on(
        "user_joined",
        async (data: CallPeerInfo) => {
          const peerId = data.socketId;
          if (!peerId || peerId === socket.id) return;

          if (data.userIdx !== undefined) {
            closeStalePeersForUser(data.userIdx, peerId);
          }

          // 湲곗〈 peer硫??꾨줈?꾨쭔 ?낅뜲?댄듃
          const existingEntry = peersRef.current.get(peerId);
          if (existingEntry) {
            if (data.userIdx !== undefined) existingEntry.userIdx = data.userIdx;
            upsertSocketParticipant(
              { ...data, userIdx: data.userIdx ?? existingEntry.userIdx },
            );
            return;
          }

          // peer瑜?await ?꾩뿉 癒쇱? ?앹꽦 ??ICE ?꾨낫 ?꾩갑 ??drop 諛⑹?
          const pc = createPeer(peerId);
          const entry = peersRef.current.get(peerId)!;
          if (data.userIdx !== undefined) entry.userIdx = data.userIdx;
          upsertSocketParticipant(data);

          // video(移대찓?? / audio / video(?붾㈃怨듭쑀) ?몃옖?쒕쾭瑜?珥덇린遺??紐⑤몢 異붽?
          const videoTransceiver = pc.addTransceiver("video", { direction: "sendrecv" });
          const audioTransceiver = pc.addTransceiver("audio", { direction: "sendrecv" });
          const screenTransceiver = pc.addTransceiver("video", { direction: "sendrecv" });
          entry.videoSender = videoTransceiver.sender;
          entry.audioSender = audioTransceiver.sender;
          entry.screenSender = screenTransceiver.sender;

          // DataChannel: offer???ы븿?섏뼱 ?곷?諛⑹씠 ondatachannel濡??섏떊
          setupDC(pc.createDataChannel("state"), peerId);

          // ?꾩옱 耳쒖쭊 ?몃옓???덉쑝硫?利됱떆 ?꾩넚
          const videoTrack = videoStreamRef.current?.getVideoTracks()[0];
          const audioTrack = audioStreamRef.current?.getAudioTracks()[0];
          const screenTrack = screenStreamRef.current?.getVideoTracks()[0];
          if (videoTrack) videoTransceiver.sender.replaceTrack(videoTrack).catch(() => {});
          if (audioTrack) audioTransceiver.sender.replaceTrack(audioTrack).catch(() => {});
          if (screenTrack) screenTransceiver.sender.replaceTrack(screenTrack).catch(() => {});

          // Non-trickle ICE: gathering ?꾨즺 ??紐⑤뱺 candidate媛 ?ы븿??SDP ?꾩넚
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await waitForIceGathering(pc);
          console.log("[WebRTC] offer gathered, sending complete SDP");
          socket.emit("offer", {
            callRoomIdx: roomIdx,
            sdp: pc.localDescription!.sdp,
            targetSocketId: peerId,
            fromSocketId: socket.id,
            userId: myId,
          });

          // ?꾩옱 ?붾㈃ 怨듭쑀 以묒씠硫????쇱뼱?먭쾶???뚮┝
          if (screenStreamRef.current) {
            socket.emit("screen_share_start", { callRoomIdx: roomIdx, targetSocketId: peerId, fromSocketId: socket.id });
          }
          if (videoStreamRef.current) {
            socket.emit("camera_on", { callRoomIdx: roomIdx, targetSocketId: peerId, fromSocketId: socket.id });
          }
        }
      );

      socket.on(
        "offer",
        async (data: {
          targetSocketId?: string;
          fromSocketId?: string;
          fromUserIdx?: number;
          fromNickname?: string;
          nickname?: string;
          sdp?: string;
        }) => {
          if (!isSignalForMe(data)) return;
          const peerId = data.fromSocketId;
          if (!peerId || !data.sdp) return;
          const userIdx = data.fromUserIdx;
          const nickname = data.fromNickname ?? data.nickname;

          if (userIdx !== undefined) {
            closeStalePeersForUser(userIdx, peerId);
          }

          // peer瑜?await ?꾩뿉 利됱떆 ?앹꽦 ??offerer ICE ?꾨낫媛 ?섏떗ms ?댁뿉 ?꾩갑?섎?濡?drop 諛⑹?
          let pc = peersRef.current.get(peerId)?.pc;
          if (!pc) {
            pc = createPeer(peerId);
            // ?됰꽕?꾩? ?섏쨷???낅뜲?댄듃 ???쇰떒 placeholder濡?異붽?
            upsertSocketParticipant({ socketId: peerId, userIdx, nickname });
          } else if (pc.signalingState !== "stable") {
            console.log("[WebRTC] offer ignored: signalingState", peerId, pc.signalingState);
            return;
          }

          const entry = peersRef.current.get(peerId)!;
          if (userIdx !== undefined) entry.userIdx = userIdx;
          const knownUserIdx = userIdx ?? entry.userIdx;

          if (entry.lastRemoteOfferSdp === data.sdp) {
            console.log("[WebRTC] duplicate offer ignored:", peerId);
            return;
          }
          entry.lastRemoteOfferSdp = data.sdp;

          // answerer??ondatachannel濡?DataChannel ?섏떊
          pc.ondatachannel = (e) => setupDC(e.channel, peerId);

          // setRemoteDescription???됰꽕??fetch ?꾩뿉 ?섑뻾 ??ICE ?꾨낫 踰꾪띁留?媛?ν븯寃?
          await pc.setRemoteDescription({ type: "offer", sdp: data.sdp });

          // offerer???몃옖?쒕쾭?먯꽌 sender 異붿텧 + direction??sendrecv濡?紐낆떆
          // video ?쒖꽌: 泥?踰덉㎏ = 移대찓?? ??踰덉㎏ = ?붾㈃怨듭쑀
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
          // Non-trickle ICE: gathering ?꾨즺 ??紐⑤뱺 candidate媛 ?ы븿??SDP ?꾩넚
          await waitForIceGathering(pc);
          console.log("[WebRTC] answer gathered, sending complete SDP");
          socket.emit("answer", {
            callRoomIdx: roomIdx,
            sdp: pc.localDescription!.sdp,
            targetSocketId: peerId,
            fromSocketId: socket.id,
            userId: myId,
          });
          entry.readyForRenegotiation = true;

          // ?꾩옱 ?붾㈃ 怨듭쑀/移대찓???곹깭瑜??ㅽ띁?ъ뿉寃뚮룄 ?뚮┝
          if (screenStreamRef.current) {
            socket.emit("screen_share_start", { callRoomIdx: roomIdx, targetSocketId: peerId, fromSocketId: socket.id });
          }
          if (videoStreamRef.current) {
            socket.emit("camera_on", { callRoomIdx: roomIdx, targetSocketId: peerId, fromSocketId: socket.id });
          }

          // ?꾨줈???됰꽕???꾩씠??? WebRTC ?묒긽 ?꾨즺 ??fetch
          const profile =
            nickname
              ? getSocketProfile({ socketId: peerId, userIdx: knownUserIdx, nickname })
              : knownUserIdx !== undefined
              ? await getProfile(knownUserIdx)
              : { name: peerId, username: peerId };
          upsertRemoteParticipant(peerId, profile, knownUserIdx);
        }
      );

      // answer ?섏떊 ??珥덇린 ?묒긽 ?꾨즺
      socket.on(
        "answer",
        async (data: AnswerPayload) => {
          if (!isSignalForMe(data)) return;
          const peerId = resolveAnswerPeerId(data);
          console.log("[WebRTC] answer event ??fromSocketId:", peerId, "| peer exists:", !!peersRef.current.get(peerId!));
          if (!peerId || !data.sdp) return;
          const peer = peersRef.current.get(peerId);
          if (peer) {
            if (
              peer.lastRemoteAnswerSdp === data.sdp ||
              peer.applyingRemoteAnswer ||
              peer.pc.signalingState !== "have-local-offer"
            ) {
              console.log("[WebRTC] answer ignored:", peerId, peer.pc.signalingState);
              return;
            }
            peer.applyingRemoteAnswer = true;
            try {
              const localOfferSignature = getMLineSignature(peer.pc.localDescription?.sdp);
              const remoteAnswerSignature = getMLineSignature(data.sdp);
              if (
                localOfferSignature &&
                remoteAnswerSignature &&
                localOfferSignature !== remoteAnswerSignature
              ) {
                console.warn("[WebRTC] answer ignored: m-line order mismatch", {
                  peerId,
                  localOfferSignature,
                  remoteAnswerSignature,
                });
                peer.lastRemoteAnswerSdp = data.sdp;
                return;
              }
              if (peer.pc.signalingState !== "have-local-offer") {
                console.log("[WebRTC] answer ignored before setRemoteDescription:", peerId, peer.pc.signalingState);
                return;
              }
              await peer.pc.setRemoteDescription({ type: "answer", sdp: data.sdp });
              peer.lastRemoteAnswerSdp = data.sdp;
              console.log("[WebRTC] setRemoteDescription(answer) OK ??signalingState:", peer.pc.signalingState, "iceState:", peer.pc.iceConnectionState);
              peer.readyForRenegotiation = true;
              upsertSocketParticipant({
                socketId: peerId,
                userIdx: data.fromUserIdx,
                nickname: data.fromNickname ?? data.nickname,
              });
            } catch (e) {
              console.error("[WebRTC] setRemoteDescription(answer) FAILED:", e);
            } finally {
              peer.applyingRemoteAnswer = false;
            }
          } else {
            console.warn("[WebRTC] answer received but no peer found for", peerId);
          }
        }
      );

      // ICE candidate ?섏떊 (?쒕쾭媛 trickle ICE瑜?吏?먰븷 寃쎌슦 ?ъ슜)
      const handleIceCandidate = async (data: {
          targetSocketId?: string;
          fromSocketId?: string;
          candidate?: string;
          sdpMid?: string | null;
          sdpMLineIndex?: number | null;
        }) => {
          if (!isSignalForMe(data)) return;
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
        };
      socket.on("candidate", handleIceCandidate);
      socket.on("ice_candidate", handleIceCandidate);

      // ?붾㈃ 怨듭쑀 ?쒖옉/醫낅즺 ?섏떊
      socket.on("screen_share_start", (data: { targetSocketId?: string; fromSocketId?: string }) => {
        if (!isSignalForMe(data)) return;
        const peerId = data.fromSocketId;
        if (!peerId) return;
        setRemoteParticipants((prev) =>
          prev.map((p) => (p.id === peerId ? { ...p, isScreenSharing: true } : p))
        );
      });

      socket.on("screen_share_stop", (data: { targetSocketId?: string; fromSocketId?: string }) => {
        if (!isSignalForMe(data)) return;
        const peerId = data.fromSocketId;
        if (!peerId) return;
        setRemoteParticipants((prev) =>
          prev.map((p) => (p.id === peerId ? { ...p, isScreenSharing: false } : p))
        );
      });

      // 移대찓??on/off ?섏떊
      socket.on("camera_on", (data: { targetSocketId?: string; fromSocketId?: string }) => {
        if (!isSignalForMe(data)) return;
        const peerId = data.fromSocketId;
        if (!peerId) return;
        setRemoteParticipants((prev) =>
          prev.map((p) => (p.id === peerId ? { ...p, isCameraOff: false } : p))
        );
      });

      socket.on("camera_off", (data: { targetSocketId?: string; fromSocketId?: string }) => {
        if (!isSignalForMe(data)) return;
        const peerId = data.fromSocketId;
        if (!peerId) return;
        setRemoteParticipants((prev) =>
          prev.map((p) => (p.id === peerId ? { ...p, isCameraOff: true } : p))
        );
      });

      // ?섏뼱 ?먮쭑 踰덉뿭 寃곌낵
      // ??寃껋씤吏 ?먮떒? VideoRoom??onTranslation 肄쒕갚?먯꽌 isDetecting 湲곕컲?쇰줈 泥섎━
      socket.on("mic_on", (data: { targetSocketId?: string; fromSocketId?: string }) => {
        if (!isSignalForMe(data)) return;
        const peerId = data.fromSocketId;
        if (!peerId) return;
        setRemoteParticipants((prev) =>
          prev.map((p) => (p.id === peerId ? { ...p, isMuted: false } : p))
        );
      });

      socket.on("mic_off", (data: { targetSocketId?: string; fromSocketId?: string }) => {
        if (!isSignalForMe(data)) return;
        const peerId = data.fromSocketId;
        if (!peerId) return;
        setRemoteParticipants((prev) =>
          prev.map((p) =>
            p.id === peerId ? { ...p, isMuted: true, isSpeaking: false } : p
          )
        );
      });

      socket.on("speaking_on", (data: { targetSocketId?: string; fromSocketId?: string }) => {
        if (!isSignalForMe(data)) return;
        const peerId = data.fromSocketId;
        if (!peerId) return;
        setRemoteParticipants((prev) =>
          prev.map((p) => (p.id === peerId ? { ...p, isSpeaking: true } : p))
        );
      });

      socket.on("speaking_off", (data: { targetSocketId?: string; fromSocketId?: string }) => {
        if (!isSignalForMe(data)) return;
        const peerId = data.fromSocketId;
        if (!peerId) return;
        setRemoteParticipants((prev) =>
          prev.map((p) => (p.id === peerId ? { ...p, isSpeaking: false } : p))
        );
      });

      const handleTranslation = (data: { text?: string }) => {
        if (data.text) {
          onTranslationRef.current?.(data.text);
        }
      };
      socket.on("translation", handleTranslation);
      socket.on("frame_translation", handleTranslation);

      // 李몄뿬???댁옣
      const handleUserLeft = (data: {
        socketId?: string;
        fromSocketId?: string;
        userIdx?: number;
      }) => {
        const peerId = data.socketId ?? data.fromSocketId;
        if (peerId) {
          closePeer(peerId);
          return;
        }
      };
      socket.on("leave", handleUserLeft);
      socket.on("user_left", handleUserLeft);

      // 諛???젣 (諛⑹옣??諛⑹쓣 ??젣?덉쓣 ???쒕쾭媛 諛??꾩껜??釉뚮줈?쒖틦?ㅽ듃)
      socket.on("room_deleted", () => {
        onRoomDeletedRef.current?.();
      });
    }); // getFreshToken().then

    return () => {
      cancelled = true;
      const s = socketRef.current;
      if (s) {
        s.emit("leave_call", { callRoomIdx: roomIdx });
        s.emit("leave", { callRoomIdx: roomIdx });
        s.disconnect();
        socketRef.current = null;
      }
      closeAllPeers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId]);

  const sendCaption = useCallback((text: string) => {
    const msg = JSON.stringify({ type: "caption", name: nicknameRef.current, text });
    peersRef.current.forEach((entry) => {
      if (entry.dc?.readyState === "open") entry.dc.send(msg);
    });
  }, []);

  const sendSpeechCaption = useCallback((text: string) => {
    const msg = JSON.stringify({ type: "speech_caption", name: nicknameRef.current, text });
    peersRef.current.forEach((entry) => {
      if (entry.dc?.readyState === "open") entry.dc.send(msg);
    });
  }, []);

  const sendFrame = useCallback((frames: number[][]) => {
    socketRef.current?.emit("send_frame", { callRoomIdx: roomIdx, frame: frames });
  }, [roomIdx]);

  return { remoteParticipants, sendCaption, sendSpeechCaption, sendFrame };
}
