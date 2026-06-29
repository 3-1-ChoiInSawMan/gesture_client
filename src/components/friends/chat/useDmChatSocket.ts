"use client";

import { useCallback, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { getValidAccessToken } from "@/api/axiosInstance";
import { useChatStore } from "@/store/chatStore";
import { ChatRoom } from "../types";

function getOrigin() {
  if (window.location.protocol === "https:") return window.location.origin;
  try {
    return new URL(process.env.NEXT_PUBLIC_API_URL ?? "").origin;
  } catch {
    return process.env.NEXT_PUBLIC_API_URL ?? "";
  }
}

export function useDmChatSocket(rooms: ChatRoom[]) {
  const socketRef = useRef<Socket | null>(null);
  const roomsRef = useRef(rooms);
  const addMessage = useChatStore((state) => state.addMessage);
  const targetKey = rooms
    .map((room) => room.targetUserIdx)
    .filter((target): target is number => typeof target === "number" && target > 0)
    .sort((a, b) => a - b)
    .join(",");

  useEffect(() => {
    roomsRef.current = rooms;
  }, [rooms]);

  useEffect(() => {
    const targetUserIdxList = targetKey
      .split(",")
      .map(Number)
      .filter((target) => target > 0);
    if (targetUserIdxList.length === 0) return;

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
        targetUserIdxList.forEach((targetIdx) => {
          socket?.emit("join_chat", { roomType: "dm", targetIdx });
        });
      });
      socket.on("receive_message", (data: {
        roomType?: string;
        message?: string;
        fromUserIdx?: number;
      }) => {
        if (
          data.roomType !== "dm" ||
          !data.message ||
          typeof data.fromUserIdx !== "number"
        ) {
          return;
        }
        const room = roomsRef.current.find(
          (item) => item.targetUserIdx === data.fromUserIdx
        );
        if (!room) return;

        const now = new Date();
        addMessage(room.id, {
          id: `${Date.now()}-${Math.random()}`,
          roomId: room.id,
          senderId: String(data.fromUserIdx),
          senderName: room.name,
          senderUsername: room.members[0]?.username ?? String(data.fromUserIdx),
          senderProfileImage: room.avatarUrl,
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
  }, [addMessage, targetKey]);

  return useCallback((targetUserIdx: number, message: string) => {
    const socket = socketRef.current;
    if (!socket?.connected || !targetUserIdx) return false;
    socket.emit("send_message", {
      roomType: "dm",
      targetIdx: targetUserIdx,
      message,
    });
    return true;
  }, []);
}
