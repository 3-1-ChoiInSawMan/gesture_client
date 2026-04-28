"use client";

import { useEffect, useRef } from "react";
import { Message } from "../types";
import MessageItem from "./MessageItem";

interface Props {
  messages: Message[];
  myId: string;
}

export default function MessageList({ messages, myId }: Props) {
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
