"use client";

import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { useDmChatSocket } from "./useDmChatSocket";

export default function ChatWindow() {
  const { rooms, selectedRoomId, messages, sendMessage } = useChatStore();
  const { user } = useAuthStore();

  const room = rooms.find((r) => r.id === selectedRoomId);
  const roomMessages = selectedRoomId ? (messages[selectedRoomId] ?? []) : [];
  const myId = user?.id ?? "me";
  const sendSocketMessage = useDmChatSocket(
    room?.id ?? "",
    room?.targetUserIdx
  );

  if (!room) return null;

  const handleSend = (content: string) => {
    sendSocketMessage(content);
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
