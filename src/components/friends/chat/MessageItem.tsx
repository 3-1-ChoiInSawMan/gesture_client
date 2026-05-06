"use client";

import { Message } from "../types";

interface Props {
  message: Message;
  isMe: boolean;
}

export default function MessageItem({ message, isMe }: Props) {
  const isMention = message.content.startsWith("@");

  if (isMe) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        {message.replyToName && (
          <span className="text-[10px] text-[#AAAAAA]">
            {message.replyToName}님 메시지에 답장
          </span>
        )}
        <div className="flex items-end gap-1.5">
          <span className="text-[10px] text-[#AAAAAA] shrink-0">{message.time}</span>
          <div
            className={`max-w-[320px] px-4 py-2.5 rounded-[18px] rounded-tr-[4px] text-[14px] leading-relaxed whitespace-pre-wrap ${
              isMention
                ? "bg-[#724BFD]/20 text-[#724BFD] font-medium"
                : "bg-[#724BFD] text-white"
            }`}
          >
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2">
      <div className="w-8 h-8 rounded-full bg-[#CCCCCC] flex items-center justify-center shrink-0 mt-0.5 text-white text-[12px] font-bold">
        {message.senderName[0]}
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[12px] font-semibold text-[#333333]">{message.senderName}</span>
        <div className="flex items-end gap-1.5">
          <div
            className={`max-w-[320px] px-4 py-2.5 rounded-[18px] rounded-tl-[4px] text-[14px] leading-relaxed whitespace-pre-wrap ${
              isMention
                ? "bg-[#724BFD]/10 text-[#724BFD] font-medium"
                : "bg-[#F0F0F0] text-[#333333]"
            }`}
          >
            {message.content}
          </div>
          <span className="text-[10px] text-[#AAAAAA] shrink-0">{message.time}</span>
        </div>
      </div>
    </div>
  );
}
