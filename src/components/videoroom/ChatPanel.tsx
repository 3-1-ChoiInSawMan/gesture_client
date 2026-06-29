"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send } from "lucide-react";
import { ChatMessage } from "./types";

interface ChatPanelProps {
  roomTitle: string;
  messages: ChatMessage[];
  onClose: () => void;
  onSendMessage: (message: string) => void;
}

export default function ChatPanel({
  roomTitle,
  messages,
  onClose,
  onSendMessage,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const now = new Date();
  const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now
    .getMinutes()
    .toString()
    .padStart(2, "0")} ${now.getHours() < 12 ? "AM" : "PM"}`;

  return (
    <div
      className="relative z-[60] w-[340px] shrink-0 flex flex-col bg-white border-l border-[#E6E9EE] h-full"
      onMouseMove={(event) => event.stopPropagation()}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E6E9EE]">
        <div className="flex flex-col min-w-0">
          <span className="text-[13px] font-semibold text-[#333] truncate">
            {roomTitle}
          </span>
          <span className="text-[11px] text-[#AAAAAA]">{timeStr}</span>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center text-[#AAAAAA] hover:text-[#333] transition-colors shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4">
        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-2">
            {/* 아바타 */}
            <div className="w-8 h-8 rounded-full bg-[#724BFD]/20 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[12px] font-semibold text-[#724BFD]">
                {msg.name[0]}
              </span>
            </div>
            {/* 메시지 */}
            <div className="flex flex-col gap-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold text-[#333] truncate">
                  {msg.name}
                </span>
                <span className="text-[10px] text-[#AAAAAA] shrink-0">
                  @{msg.username}
                </span>
                <span className="text-[10px] text-[#AAAAAA] shrink-0 ml-auto">
                  {msg.time}
                </span>
              </div>
              <p className="text-[12px] text-[#555555] break-words leading-relaxed">
                {msg.message}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 입력 영역 */}
      <div className="px-4 py-3 border-t border-[#E6E9EE]">
        <div className="flex items-center gap-2 border border-[rgba(51,51,51,0.2)] rounded-[12px] px-3 py-2">
          <input
            type="text"
            placeholder="메시지 입력"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-[13px] text-[#333] placeholder:text-[#AAAAAA] outline-none bg-transparent"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="text-[#724BFD] disabled:text-[#CCCCCC] transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
