"use client";

import { useEffect, useState } from "react";
import { chatSocket } from "@/lib/socket";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { Message } from "@/components/friends/types";

export function useSocketChat() {
  const { receiveMessage } = useChatStore();
  const { user } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    chatSocket.connect();

    const unsubStatus = chatSocket.onStatus(setIsConnected);

    const unsubMessage = chatSocket.onMessage((raw) => {
      if (typeof raw !== "object" || raw === null) return;
      const msg = raw as Record<string, unknown>;

      // 자신이 보낸 메시지는 이미 로컬에 추가됨
      const myId = user?.id ?? "me";
      const senderId = String(msg.senderId ?? msg.sender_id ?? "");
      if (senderId === myId) return;

      // content가 있으면 채팅 메시지로 처리
      if (!msg.content) return;

      const now = new Date();
      const fallbackTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      const fallbackDate = now.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      });

      const message: Message = {
        id: String(msg.id ?? Date.now()),
        roomId: String(msg.roomId ?? msg.room_id ?? ""),
        senderId,
        senderName: String(msg.senderName ?? msg.sender_name ?? senderId),
        senderUsername: String(msg.senderUsername ?? msg.sender_username ?? senderId),
        content: String(msg.content),
        time: String(msg.time ?? fallbackTime),
        date: String(msg.date ?? fallbackDate),
      };

      receiveMessage(message);
    });

    return () => {
      unsubStatus();
      unsubMessage();
      chatSocket.disconnect();
    };
  }, [receiveMessage, user?.id]);

  return { isConnected };
}
