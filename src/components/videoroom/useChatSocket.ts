"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { ChatMessage } from "./types";

function getWsOrigin(): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "";
  try {
    return new URL(base).origin;
  } catch {
    return base;
  }
}

export function useChatSocket(
  roomId: string,
  onMessage: (msg: ChatMessage) => void
) {
  const socketRef = useRef<Socket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!roomId) return;

    const token =
      typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    const origin = getWsOrigin();

    const socket = io(origin, {
      auth: { token: token ?? "" },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_room", { call_room_id: roomId });
    });

    socket.on("receive_message", (data: { user_id: string; content: string; created_at: string }) => {
      const time = data.created_at
        ? new Date(data.created_at).toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : new Date().toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          });

      onMessageRef.current({
        id: `${Date.now()}-${Math.random()}`,
        participantId: data.user_id,
        name: data.user_id,
        username: data.user_id,
        message: data.content,
        time,
      });
    });

    return () => {
      if (socket.connected) {
        socket.emit("leave_room", { call_room_id: roomId });
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId]);

  const sendMessage = useCallback(
    (message: string) => {
      socketRef.current?.emit("send_message", { call_room_id: roomId, content: message });
    },
    [roomId]
  );

  return { sendMessage };
}
