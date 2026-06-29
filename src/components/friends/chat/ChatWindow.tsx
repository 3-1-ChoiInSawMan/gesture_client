"use client";

import { useCallback, useEffect } from "react";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { toast } from "react-toastify";
import { chatRoomApi, StoredChatMessage } from "@/api/chatRoomApi";
import { Message } from "../types";

interface Props {
  onSendDm: (targetUserIdx: number, message: string) => boolean;
}

const toMessage = (message: StoredChatMessage, roomId: string): Message => {
  const createdAt = new Date(message.createdAt);
  const validDate = !Number.isNaN(createdAt.getTime());
  return {
    id: String(message.messageIdx),
    roomId,
    senderId: message.sender.userId,
    senderName: message.sender.nickname,
    senderUsername: message.sender.userId,
    senderProfileImage: message.sender.profileImageUrl ?? undefined,
    content: message.isDeleted
      ? "삭제된 메시지입니다."
      : message.type === "FILE"
        ? message.fileUrl ?? "파일"
        : message.message ?? "",
    time: validDate
      ? createdAt.toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "",
    date: validDate ? createdAt.toLocaleDateString("ko-KR") : "",
  };
};

export default function ChatWindow({ onSendDm }: Props) {
  const { rooms, selectedRoomId, messages, setMessages, addMessage } = useChatStore();
  const { user } = useAuthStore();

  const room = rooms.find((r) => r.id === selectedRoomId);
  const roomMessages = selectedRoomId ? (messages[selectedRoomId] ?? []) : [];
  const myId = user?.id ?? "me";
  const roomId = room?.id;
  const chatRoomIdx = room?.chatRoomIdx;

  const syncMessages = useCallback(async () => {
    if (!chatRoomIdx || !roomId) return;
    const page = await chatRoomApi.getMessages(chatRoomIdx, { size: 100 });
    const chronological = [...page.messages]
      .reverse()
      .map((message) => toMessage(message, roomId));
    setMessages(roomId, chronological);

    const latestMessageIdx = page.messages[0]?.messageIdx;
    if (latestMessageIdx) {
      void chatRoomApi.markAsRead(chatRoomIdx, latestMessageIdx).catch(() => {});
    }
  }, [chatRoomIdx, roomId, setMessages]);

  useEffect(() => {
    if (!chatRoomIdx) return;
    let disposed = false;
    let syncing = false;
    let firstRun = true;

    const run = async () => {
      if (disposed || syncing) return;
      syncing = true;
      try {
        await syncMessages();
      } catch {
        if (!disposed && firstRun) {
          toast.error("메시지 내역을 불러오지 못했습니다.");
        }
      } finally {
        firstRun = false;
        syncing = false;
      }
    };

    void run();
    const timer = window.setInterval(run, 2500);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [chatRoomIdx, syncMessages]);

  if (!room) return null;

  const handleSend = async (content: string): Promise<boolean> => {
    try {
      const saved = await chatRoomApi.sendText(room.chatRoomIdx, content);
      addMessage(room.id, toMessage(saved, room.id));
      if (room.targetUserIdx) {
        onSendDm(room.targetUserIdx, content);
      }
      return true;
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "메시지를 전송하지 못했습니다.";
      toast.error(message);
      return false;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      <ChatHeader room={room} />
      <MessageList messages={roomMessages} myId={myId} />
      <MessageInput onSend={handleSend} />
    </div>
  );
}
