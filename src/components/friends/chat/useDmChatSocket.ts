"use client";

import { useCallback, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { getValidAccessToken } from "@/api/axiosInstance";
import { ChatRoom } from "../types";

export interface DmSocketMessage {
  roomType: "dm";
  targetIdx: number;
  chatRoomIdx: number;
  messageIdx: number;
  message: string | null;
  type: "TEXT" | "FILE";
  fileUrl: string | null;
  createdAt: string;
  fromUserIdx: number;
}

function getSocketOrigin() {
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    return window.location.origin;
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  try {
    return new URL(baseUrl).origin;
  } catch {
    return baseUrl;
  }
}

export function useDmChatSocket(
  room: ChatRoom | undefined,
  onMessage: (message: DmSocketMessage, isOwn: boolean) => void
) {
  const socketRef = useRef<Socket | null>(null);
  const onMessageRef = useRef(onMessage);
  const targetUserIdx = room?.targetUserIdx;
  const chatRoomIdx = room?.chatRoomIdx;

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!targetUserIdx || !chatRoomIdx) return;

    let disposed = false;

    const connect = async () => {
      const token = await getValidAccessToken();
      if (disposed) return;

      const transports =
        window.location.protocol === "https:" ? ["polling"] : ["websocket"];
      const socket = io(`${getSocketOrigin()}/chat`, {
        auth: { token: token ?? "" },
        query: { token: token ?? "" },
        extraHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
        transports,
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("join_chat", {
          roomType: "dm",
          targetIdx: targetUserIdx,
        });
      });

      const handleMessage = (payload: DmSocketMessage, isOwn: boolean) => {
        if (
          payload.roomType !== "dm" ||
          Number(payload.chatRoomIdx) !== chatRoomIdx ||
          !Number.isInteger(Number(payload.messageIdx))
        ) {
          return;
        }
        onMessageRef.current(payload, isOwn);
      };

      socket.on("message_sent", (payload: DmSocketMessage) => {
        handleMessage(payload, true);
      });
      socket.on("receive_message", (payload: DmSocketMessage) => {
        handleMessage(payload, false);
      });
    };

    void connect();

    return () => {
      disposed = true;
      const socket = socketRef.current;
      if (socket) {
        socket.emit("leave_chat", {
          roomType: "dm",
          targetIdx: targetUserIdx,
        });
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [chatRoomIdx, targetUserIdx]);

  return useCallback(
    (message: string) => {
      const socket = socketRef.current;
      if (!socket?.connected || !targetUserIdx) return false;

      socket.emit("send_message", {
        roomType: "dm",
        targetIdx: targetUserIdx,
        message,
      });
      return true;
    },
    [targetUserIdx]
  );
}
