"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { chatRoomApi, StoredChatMessage } from "@/api/chatRoomApi";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { Message } from "../types";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageList from "./MessageList";

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toMessage = (roomId: string, item: StoredChatMessage): Message => ({
  id: String(item.messageIdx),
  roomId,
  senderId: item.sender.userId,
  senderName: item.sender.nickname,
  senderUsername: item.sender.userId,
  senderProfileImage: item.sender.profileImageUrl ?? undefined,
  content: item.isDeleted || item.deleted ? "삭제된 메시지입니다." : item.message ?? "파일",
  type: item.type,
  fileUrl: item.fileUrl ?? undefined,
  time: formatTime(item.createdAt),
  date: formatDate(item.createdAt),
});

export default function ChatWindow() {
  const { rooms, selectedRoomId, messages, setMessages, mergeMessages, addMessage } =
    useChatStore();
  const user = useAuthStore((state) => state.user);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const room = rooms.find((item) => item.id === selectedRoomId);
  const roomMessages = selectedRoomId ? messages[selectedRoomId] ?? [] : [];
  const myId = user?.id ?? "me";

  const markLatestAsRead = useCallback(
    (messageItems: StoredChatMessage[]) => {
      if (!room || messageItems.length === 0) return;
      const latestIdx = Math.max(...messageItems.map((item) => item.messageIdx));
      void chatRoomApi.markAsRead(room.chatRoomIdx, latestIdx).catch(() => undefined);
    },
    [room]
  );

  useEffect(() => {
    if (!room) return;
    let disposed = false;

    const loadInitial = async () => {
      try {
        const page = await chatRoomApi.getMessages(room.chatRoomIdx, { size: 20 });
        if (disposed) return;
        setMessages(
          room.id,
          [...page.messages].reverse().map((item) => toMessage(room.id, item))
        );
        setNextCursor(page.nextCursor);
        setHasMore(page.hasNext);
        markLatestAsRead(page.messages);
      } catch {
        if (!disposed) toast.error("메시지를 불러오지 못했습니다.");
      }
    };

    void loadInitial();
    return () => {
      disposed = true;
    };
  }, [room, setMessages, markLatestAsRead]);

  useEffect(() => {
    if (!room) return;
    let disposed = false;
    let polling = false;

    const poll = async () => {
      if (disposed || polling) return;
      polling = true;
      try {
        const page = await chatRoomApi.getMessages(room.chatRoomIdx, { size: 20 });
        if (!disposed) {
          mergeMessages(
            room.id,
            [...page.messages].reverse().map((item) => toMessage(room.id, item))
          );
          markLatestAsRead(page.messages);
        }
      } catch {
        // A temporary polling failure should not interrupt the open chat.
      } finally {
        polling = false;
      }
    };

    const timer = window.setInterval(poll, 2500);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [room, mergeMessages, markLatestAsRead]);

  if (!room) return null;

  const loadOlder = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await chatRoomApi.getMessages(room.chatRoomIdx, {
        cursor: nextCursor,
        size: 20,
      });
      mergeMessages(
        room.id,
        [...page.messages].reverse().map((item) => toMessage(room.id, item))
      );
      setNextCursor(page.nextCursor);
      setHasMore(page.hasNext);
    } catch {
      toast.error("이전 메시지를 불러오지 못했습니다.");
    } finally {
      setLoadingMore(false);
    }
  };

  const sendText = async (content: string) => {
    try {
      const sent = await chatRoomApi.sendText(room.chatRoomIdx, content);
      addMessage(room.id, toMessage(room.id, sent));
      return true;
    } catch {
      toast.error("메시지를 보내지 못했습니다.");
      return false;
    }
  };

  const sendFile = async (file: File) => {
    try {
      const fileUuid = await chatRoomApi.uploadFile(file);
      const sent = await chatRoomApi.sendFile(room.chatRoomIdx, fileUuid);
      addMessage(room.id, toMessage(room.id, sent));
      return true;
    } catch {
      toast.error("파일을 보내지 못했습니다.");
      return false;
    }
  };

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-white">
      <ChatHeader room={room} />
      <MessageList
        messages={roomMessages}
        myId={myId}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={loadOlder}
      />
      <MessageInput onSend={sendText} onSendFile={sendFile} />
    </div>
  );
}
