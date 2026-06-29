"use client";

import { ChangeEvent, useRef, useState } from "react";
import { LoaderCircle, Paperclip, Send } from "lucide-react";

interface Props {
  onSend: (content: string) => Promise<boolean>;
  onSendFile: (file: File) => Promise<boolean>;
}

export default function MessageInput({ onSend, onSendFile }: Props) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    if (!value.trim() || sending) return;
    setSending(true);
    const sent = await onSend(value.trim());
    if (sent) setValue("");
    setSending(false);
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || sending) return;
    setSending(true);
    await onSendFile(file);
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-6 py-4 border-t border-[#EEEEEE] flex items-center gap-3">
      <input ref={fileInputRef} type="file" onChange={handleFile} className="hidden" />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={sending}
        title="파일 보내기"
        className="text-[#888888] hover:text-[#724BFD] disabled:text-[#CCCCCC]"
      >
        <Paperclip size={20} />
      </button>
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
        disabled={!value.trim() || sending}
        title="메시지 보내기"
        className="text-[#724BFD] disabled:text-[#CCCCCC] transition-colors"
      >
        {sending ? <LoaderCircle size={20} className="animate-spin" /> : <Send size={20} />}
      </button>
    </div>
  );
}
