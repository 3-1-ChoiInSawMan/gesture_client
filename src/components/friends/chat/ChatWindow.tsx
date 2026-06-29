"use client";

import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { toast } from "react-toastify";

interface Props {
  onSendDm: (targetUserIdx: number, message: string) => boolean;
}

export default function ChatWindow({ onSendDm }: Props) {
  const { rooms, selectedRoomId, messages, sendMessage } = useChatStore();
  const { user } = useAuthStore();

  const room = rooms.find((r) => r.id === selectedRoomId);
  const roomMessages = selectedRoomId ? (messages[selectedRoomId] ?? []) : [];
  const myId = user?.id ?? "me";

  if (!room) return null;

  const handleSend = (content: string) => {
    if (!room.targetUserIdx || !onSendDm(room.targetUserIdx, content)) {
      toast.error("채팅 서버에 연결되지 않았습니다.");
      return;
    }
    sendMessage(room.id, content, myId, user?.nickname ?? "나");
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      <ChatHeader room={room} />
      <MessageList messages={roomMessages} myId={myId} />
      <MessageInput onSend={handleSend} />
    </div>
  );
}
