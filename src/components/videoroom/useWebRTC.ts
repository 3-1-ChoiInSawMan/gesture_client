"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Participant } from "./types";

const SIGNAL_URL =
  process.env.NEXT_PUBLIC_WEBRTC_WS_URL ?? "ws://172.28.19.233:8080/cals";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

interface PeerEntry {
  pc: RTCPeerConnection;
  stream: MediaStream;
}

interface SignalMsg {
  callRoomIdx?: number;
  type?: string;
  sdp?: string;
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  userId?: string;
}

export function useWebRTC(params: {
  roomId: string;
  userId: string;
  nickname: string;
  localVideoStream: MediaStream | null;
  localAudioStream: MediaStream | null;
}) {
  const { roomId, userId, localVideoStream, localAudioStream } = params;
  const [remoteParticipants, setRemoteParticipants] = useState<Participant[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const peersRef = useRef<Map<string, PeerEntry>>(new Map());
  const videoStreamRef = useRef<MediaStream | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  videoStreamRef.current = localVideoStream;
  audioStreamRef.current = localAudioStream;

  const roomIdx = Number(roomId);

  const send = useCallback((msg: SignalMsg) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  const addLocalTracks = useCallback((pc: RTCPeerConnection) => {
    const video = videoStreamRef.current;
    const audio = audioStreamRef.current;
    if (video) {
      video.getVideoTracks().forEach((t) => {
        if (!pc.getSenders().find((s) => s.track === t)) {
          pc.addTrack(t, video);
        }
      });
    }
    if (audio) {
      audio.getAudioTracks().forEach((t) => {
        if (!pc.getSenders().find((s) => s.track === t)) {
          pc.addTrack(t, audio);
        }
      });
    }
  }, []);

  const createPeer = useCallback(
    (peerId: string): RTCPeerConnection => {
      const remoteStream = new MediaStream();
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      addLocalTracks(pc);

      pc.ontrack = (e) => {
        e.streams[0]?.getTracks().forEach((t) => remoteStream.addTrack(t));
        setRemoteParticipants((prev) =>
          prev.map((p) =>
            p.id === peerId ? { ...p, stream: remoteStream, isCameraOff: false } : p
          )
        );
      };

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          send({
            callRoomIdx: roomIdx,
            type: "candidate",
            candidate: e.candidate.candidate,
            sdpMid: e.candidate.sdpMid,
            sdpMLineIndex: e.candidate.sdpMLineIndex,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          peersRef.current.delete(peerId);
          setRemoteParticipants((prev) => prev.filter((p) => p.id !== peerId));
        }
      };

      peersRef.current.set(peerId, { pc, stream: remoteStream });
      return pc;
    },
    [addLocalTracks, send, roomIdx]
  );

  // 카메라/마이크 on/off 시 기존 peer들에 track 교체
  useEffect(() => {
    peersRef.current.forEach(({ pc }) => {
      const senders = pc.getSenders();

      const videoTrack = localVideoStream?.getVideoTracks()[0] ?? null;
      const videoSender = senders.find((s) => s.track?.kind === "video");
      if (videoSender) videoSender.replaceTrack(videoTrack).catch(() => {});
      else if (videoTrack && localVideoStream) pc.addTrack(videoTrack, localVideoStream);

      const audioTrack = localAudioStream?.getAudioTracks()[0] ?? null;
      const audioSender = senders.find((s) => s.track?.kind === "audio");
      if (audioSender) audioSender.replaceTrack(audioTrack).catch(() => {});
      else if (audioTrack && localAudioStream) pc.addTrack(audioTrack, localAudioStream);
    });
  }, [localVideoStream, localAudioStream]);

  useEffect(() => {
    if (!roomId || !userId) return;

    const ws = new WebSocket(SIGNAL_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      // 방 입장 알림
      ws.send(JSON.stringify({ callRoomIdx: roomIdx, type: "join", userId }));
    };

    ws.onmessage = async (event) => {
      let msg: SignalMsg;
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }

      const { type, userId: peerId } = msg;
      if (!peerId || peerId === userId) return;

      if (type === "offer" && msg.sdp) {
        let pc = peersRef.current.get(peerId)?.pc;
        if (!pc) {
          pc = createPeer(peerId);
          setRemoteParticipants((prev) =>
            prev.find((p) => p.id === peerId)
              ? prev
              : [...prev, { id: peerId, name: peerId, username: peerId, isCameraOff: true, isMuted: true }]
          );
        }
        await pc.setRemoteDescription({ type: "offer", sdp: msg.sdp });
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        send({ callRoomIdx: roomIdx, type: "answer", sdp: answer.sdp });

      } else if (type === "answer" && msg.sdp) {
        const peer = peersRef.current.get(peerId);
        if (peer) {
          await peer.pc.setRemoteDescription({ type: "answer", sdp: msg.sdp });
        }

      } else if (type === "candidate" && msg.candidate) {
        const peer = peersRef.current.get(peerId);
        if (peer) {
          await peer.pc.addIceCandidate({
            candidate: msg.candidate,
            sdpMid: msg.sdpMid ?? null,
            sdpMLineIndex: msg.sdpMLineIndex ?? null,
          }).catch(() => {});
        }

      } else if (type === "join") {
        // 새 참여자 입장 — offer 전송
        const pc = createPeer(peerId);
        setRemoteParticipants((prev) =>
          prev.find((p) => p.id === peerId)
            ? prev
            : [...prev, { id: peerId, name: peerId, username: peerId, isCameraOff: true, isMuted: true }]
        );
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        send({ callRoomIdx: roomIdx, type: "offer", sdp: offer.sdp });

      } else if (type === "leave") {
        const peer = peersRef.current.get(peerId);
        if (peer) {
          peer.pc.close();
          peersRef.current.delete(peerId);
        }
        setRemoteParticipants((prev) => prev.filter((p) => p.id !== peerId));
      }
    };

    ws.onerror = () => {};
    ws.onclose = () => {
      peersRef.current.forEach(({ pc }) => pc.close());
      peersRef.current.clear();
      setRemoteParticipants([]);
    };

    return () => {
      send({ callRoomIdx: roomIdx, type: "leave", userId });
      ws.close();
      wsRef.current = null;
      peersRef.current.forEach(({ pc }) => pc.close());
      peersRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId]);

  return { remoteParticipants };
}
