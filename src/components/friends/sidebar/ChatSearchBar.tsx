"use client";

import { Search, UserPlus, MessageSquarePlus, UsersRound } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onAddFriend: () => void;
  onNewMessage: () => void;
  onRequests: () => void;
}

export default function ChatSearchBar({ value, onChange, onAddFriend, onNewMessage, onRequests }: Props) {
  return (
    <div className="px-4 py-3 flex items-center gap-2 border-b border-[#EEEEEE]">
      <div className="flex-1 flex items-center gap-2 bg-[#F5F5F5] rounded-[20px] px-3 h-8">
        <Search size={14} className="text-[#AAAAAA] shrink-0" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="검색어를 입력해주세요"
          className="flex-1 bg-transparent text-[12px] outline-none text-[#333333] placeholder:text-[#AAAAAA]"
        />
      </div>
      <button
        onClick={onRequests}
        className="text-[#888888] hover:text-[#724BFD] transition-colors"
        title="받은 친구 요청"
      >
        <UsersRound size={18} />
      </button>
      <button
        onClick={onAddFriend}
        className="text-[#888888] hover:text-[#724BFD] transition-colors"
        title="친구 추가"
      >
        <UserPlus size={18} />
      </button>
      <button
        onClick={onNewMessage}
        className="text-[#888888] hover:text-[#724BFD] transition-colors"
        title="새 메시지"
      >
        <MessageSquarePlus size={18} />
      </button>
    </div>
  );
}
