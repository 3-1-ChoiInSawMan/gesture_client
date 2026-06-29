"use client";

import { useEffect, useRef } from "react";
import { LoaderCircle } from "lucide-react";
import { Message } from "../types";
import MessageItem from "./MessageItem";

interface Props {
  messages: Message[];
  myId: string;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}

export default function MessageList({
  messages,
  myId,
  hasMore,
  loadingMore,
  onLoadMore,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Group messages by date for date separators
  const grouped: { date: string; messages: Message[] }[] = [];
  for (const msg of messages) {
    const last = grouped[grouped.length - 1];
    if (last && last.date === msg.date) {
      last.messages.push(msg);
    } else {
      grouped.push({ date: msg.date, messages: [msg] });
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
      {hasMore && (
        <button
          onClick={onLoadMore}
          disabled={loadingMore}
          className="mx-auto flex h-8 items-center gap-2 px-3 text-[12px] text-[#666666] hover:text-[#724BFD] disabled:text-[#AAAAAA]"
        >
          {loadingMore && <LoaderCircle size={14} className="animate-spin" />}
          이전 메시지 불러오기
        </button>
      )}
      {grouped.map((group) => (
        <div key={group.date} className="flex flex-col gap-3">
          <div className="flex items-center justify-center">
            <span className="text-[11px] text-[#AAAAAA] bg-white px-3">
              {group.date}
            </span>
          </div>
          {group.messages.map((msg) => (
            <MessageItem key={msg.id} message={msg} isMe={msg.senderId === myId} />
          ))}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
