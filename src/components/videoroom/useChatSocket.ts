"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { ChatMessage, Participant } from "./types";

function getWsOrigin(): string {
  // HTTPS 환경: 같은 origin으로 연결 → Vercel rewrite가 socket.io를 백엔드로 프록시
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    return window.location.origin;
  }
  const base = process.env.NEXT_PUBLIC_API_URL ?? "";
  try {
    return new URL(base).origin;
  } catch {
    return base;
  }
}

export function useChatSocket(
  roomId: string,
  participants: Participant[],
  onMessage: (msg: ChatMessage) => void
) {
  const socketRef = useRef<Socket | null>(null);
  const onMessageRef = useRef(onMessage);
  const participantsRef = useRef(participants);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  useEffect(() => {
    if (!roomId) return;
    let disposed = false;

    const token =
      typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    const origin = getWsOrigin();

    // HTTPS(Vercel) 환경: Vercel은 WebSocket 프록시 불가 → polling 트랜스포트 사용
    // HTTP 로컬 개발: WebSocket 직접 연결
    const transports =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? ["polling"]
        : ["websocket"];

    const socket = io(`${origin}/chat`, {
      auth: { token: token ?? "" },
      query: { token: token ?? "" },
      extraHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
      transports,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      if (disposed) {
        socket.disconnect();
        return;
      }
      socket.emit("join_chat", { roomType: "call", targetIdx: Number(roomId) });
    });

    socket.on(
      "receive_message",
      (data: {
        roomType?: string;
        targetIdx?: number;
        message?: string;
        content?: string;
        created_at?: string;
        createdAt?: string;
        fromUserIdx?: number;
        fromSocketId?: string;
        user_id?: string;
      }) => {
        if (data.roomType && data.roomType !== "call") return;
        if (data.targetIdx !== undefined && String(data.targetIdx) !== String(roomId)) return;

        const createdAt = data.created_at ?? data.createdAt;
        const time = createdAt
          ? new Date(createdAt).toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          })
          : new Date().toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          });
        const participant = participantsRef.current.find(
          (item) => item.userIdx === data.fromUserIdx
        );
        const fallbackId = data.fromUserIdx ? String(data.fromUserIdx) : data.user_id ?? "unknown";

        onMessageRef.current({
          id: `${Date.now()}-${Math.random()}`,
          participantId: participant?.id ?? data.fromSocketId ?? fallbackId,
          name: participant?.name ?? `User ${fallbackId}`,
          username: participant?.username ?? fallbackId,
          message: data.message ?? data.content ?? "",
          time,
        });
      }
    );

    return () => {
      disposed = true;
      if (socket.connected) {
        socket.disconnect();
      } else {
        socket.once("connect", () => socket.disconnect());
      }
      socketRef.current = null;
    };
  }, [roomId]);

  const sendMessage = useCallback(
    (message: string) => {
      socketRef.current?.emit("send_message", {
        roomType: "call",
        targetIdx: Number(roomId),
        message,
      });
    },
    [roomId]
  );

  return { sendMessage };
}
