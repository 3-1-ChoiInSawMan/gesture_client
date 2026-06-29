"use client";

import { useState } from "react";
import { Send } from "lucide-react";

interface Props {
  onSend: (content: string) => void;
}

export default function MessageInput({ onSend }: Props) {
  const [value, setValue] = useState("");

  const handleSend = () => {
    if (!value.trim()) return;
    onSend(value.trim());
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-6 py-4 border-t border-[#EEEEEE] flex items-center gap-3">
      <div className="flex-1 flex items-center bg-[#F5F5F5] rounded-[24px] px-4 py-2.5 gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지 입력..."
          className="flex-1 bg-transparent text-[14px] outline-none text-[#333333] placeholder:text-[#AAAAAA]"
        />
      </div>
      <button
        onClick={handleSend}
        disabled={!value.trim()}
        className="text-[#724BFD] disabled:text-[#CCCCCC] transition-colors"
      >
        <Send size={20} />
      </button>
    </div>
  );
}
