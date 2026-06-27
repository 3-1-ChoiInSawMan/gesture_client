"use client";

import { useCallback, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { getValidAccessToken } from "@/api/axiosInstance";
import { useChatStore } from "@/store/chatStore";

function getOrigin() {
  if (window.location.protocol === "https:") return window.location.origin;
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "").origin;
  } catch {
    return process.env.NEXT_PUBLIC_API_URL ?? "";
  }
}

export function useDmChatSocket(roomId: string, targetUserIdx?: number) {
  const socketRef = useRef<Socket | null>(null);
  const addMessage = useChatStore((state) => state.addMessage);

  useEffect(() => {
    if (!targetUserIdx) return;
    let disposed = false;
    let socket: Socket | null = null;

    void getValidAccessToken().then((token) => {
      if (disposed) return;
      socket = io(`${getOrigin()}/chat`, {
        auth: { token: token ?? "" },
        query: { token: token ?? "" },
        transports: window.location.protocol === "https:" ? ["polling"] : ["websocket"],
      });
      socketRef.current = socket;
      socket.on("connect", () => {
        socket?.emit("join_chat", { roomType: "dm", targetIdx: targetUserIdx });
      });
      socket.on("receive_message", (data: {
        roomType?: string;
        message?: string;
        fromUserIdx?: number;
      }) => {
        if (data.roomType !== "dm" || !data.message) return;
        const now = new Date();
        addMessage(roomId, {
          id: `${Date.now()}-${Math.random()}`,
          roomId,
          senderId: String(data.fromUserIdx ?? targetUserIdx),
          senderName: "친구",
          senderUsername: String(data.fromUserIdx ?? targetUserIdx),
          content: data.message,
          time: now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
          date: now.toLocaleDateString("ko-KR"),
        });
      });
    });

    return () => {
      disposed = true;
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [addMessage, roomId, targetUserIdx]);

  return useCallback((message: string) => {
    socketRef.current?.emit("send_message", {
      roomType: "dm",
      targetIdx: targetUserIdx,
      message,
    });
  }, [targetUserIdx]);
}
