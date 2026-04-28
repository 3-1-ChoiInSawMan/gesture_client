"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { FriendUser, FriendStatus } from "../types";
import { ALL_USERS } from "../mockData";
import { toast } from "react-toastify";

interface Props {
  onClose: () => void;
}

const STATUS_LABEL: Record<FriendStatus, string> = {
  friend: "친구",
  sent: "보냄",
  none: "추가",
};

const STATUS_STYLE: Record<FriendStatus, string> = {
  friend: "bg-[#F0EEFF] text-[#724BFD]",
  sent: "bg-[#F5F5F5] text-[#AAAAAA]",
  none: "bg-[#724BFD] text-white hover:bg-[#5f3de0]",
};

export default function AddFriendModal({ onClose }: Props) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<FriendUser[]>(ALL_USERS);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const filtered = query
    ? users.filter((u) => u.username.toLowerCase().includes(query.toLowerCase()))
    : [];

  const handleAction = (userId: string, status: FriendStatus) => {
    if (status === "friend" || status === "sent") return;
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: "sent" } : u))
    );
    toast.success("친구 요청을 보냈습니다.");
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="w-[420px] h-[480px] bg-white rounded-[16px] shadow-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 pt-5 pb-4">
            <h2 className="text-[18px] font-bold text-[#333333]">친구 추가</h2>
            <button onClick={onClose} className="text-[#AAAAAA] hover:text-[#333]">
              <X size={18} />
            </button>
          </div>

          <div className="px-6 pb-4">
            <label className="text-[13px] font-semibold text-[#333333] block mb-2">아이디</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="아이디를 입력하세요"
              className="w-full h-[44px] border border-[#DDDDDD] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#724BFD] transition-colors"
            />
          </div>

          <div className="px-4 flex-1 overflow-y-auto">
            {filtered.length === 0 && query && (
              <p className="text-center text-[13px] text-[#AAAAAA] py-4">검색 결과가 없습니다.</p>
            )}
            {filtered.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 px-2 py-2.5 border-b border-[#F5F5F5] last:border-0"
              >
                <div className="w-9 h-9 rounded-full bg-[#CCCCCC] flex items-center justify-center text-white text-[14px] font-bold shrink-0">
                  {u.nickname[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#333333]">{u.nickname}</p>
                  <p className="text-[12px] text-[#AAAAAA]">@{u.username}</p>
                </div>
                <button
                  onClick={() => handleAction(u.id, u.status)}
                  className={`shrink-0 h-[30px] px-4 rounded-[8px] text-[12px] font-medium transition-colors ${STATUS_STYLE[u.status]}`}
                >
                  {STATUS_LABEL[u.status]}
                </button>
              </div>
            ))}
          </div>

          <div className="px-6 py-4">
            <button
              onClick={onClose}
              className="w-full h-[44px] bg-[#724BFD] text-white text-[14px] font-semibold rounded-[10px] hover:bg-[#5f3de0] transition-colors"
            >
              완료
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
