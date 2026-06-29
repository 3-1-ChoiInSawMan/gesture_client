"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, LoaderCircle, Search, X } from "lucide-react";
import { toast } from "react-toastify";
import { chatRoomApi } from "@/api/chatRoomApi";
import { friendApi, Friend } from "@/api/friendApi";
import { useChatStore } from "@/store/chatStore";

interface Props {
  onClose: () => void;
  onCreated: () => Promise<void>;
}

export default function CreateChatRoomModal({ onClose, onCreated }: Props) {
  const selectRoom = useChatStore((state) => state.selectRoom);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    friendApi.getFriends()
      .then(setFriends)
      .catch(() => toast.error("친구 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return friends;
    return friends.filter(
      (friend) =>
        friend.nickname.toLowerCase().includes(keyword) ||
        friend.userId.toLowerCase().includes(keyword)
    );
  }, [friends, query]);

  const toggleFriend = (userIdx: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(userIdx)) next.delete(userIdx);
      else next.add(userIdx);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("채팅방 이름을 입력해주세요.");
      return;
    }
    if (selected.size === 0) {
      toast.error("초대할 친구를 한 명 이상 선택해주세요.");
      return;
    }

    setCreating(true);
    try {
      const room = await chatRoomApi.create(name.trim(), [...selected]);
      await onCreated();
      selectRoom(`chat-${room.chatRoomIdx}`);
      toast.success("채팅방을 만들고 친구에게 초대를 보냈습니다.");
      onClose();
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "채팅방을 만들지 못했습니다.";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="flex max-h-[78vh] w-full max-w-[520px] flex-col overflow-hidden rounded-[8px] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#EEEEEE] px-6 py-4">
          <h2 className="text-[17px] font-bold text-[#333333]">그룹 채팅방 생성</h2>
          <button type="button" onClick={onClose} title="닫기" className="flex h-8 w-8 items-center justify-center text-[#999999]">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 border-b border-[#EEEEEE] px-6 py-5">
          <div>
            <label htmlFor="chat-room-name" className="mb-2 block text-[13px] font-semibold text-[#333333]">채팅방 이름</label>
            <input
              id="chat-room-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              placeholder="채팅방 이름을 입력하세요"
              className="h-11 w-full rounded-[6px] border border-[#DDDDDD] px-4 text-[14px] outline-none focus:border-[#724BFD]"
            />
          </div>
          <div className="flex h-10 items-center gap-2 rounded-[6px] border border-[#DDDDDD] px-3">
            <Search size={16} className="text-[#AAAAAA]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="친구 검색"
              className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
            />
          </div>
        </div>

        <div className="min-h-40 flex-1 overflow-y-auto px-4 py-2">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <LoaderCircle className="animate-spin text-[#724BFD]" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-[13px] text-[#999999]">선택할 친구가 없습니다.</p>
          ) : (
            filtered.map((friend) => {
              const isSelected = selected.has(friend.idx);
              return (
                <button
                  key={friend.idx}
                  type="button"
                  onClick={() => toggleFriend(friend.idx)}
                  className={`flex w-full items-center gap-3 px-3 py-3 text-left ${
                    isSelected ? "bg-[#F3F0FF]" : "hover:bg-[#F7F7F7]"
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8E2FF] text-[14px] font-bold text-[#724BFD]">
                    {friend.nickname[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-[#333333]">{friend.nickname}</p>
                    <p className="truncate text-[12px] text-[#999999]">@{friend.userId}</p>
                  </div>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-[4px] border ${
                    isSelected ? "border-[#724BFD] bg-[#724BFD] text-white" : "border-[#CCCCCC] text-transparent"
                  }`}>
                    <Check size={13} />
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#EEEEEE] px-6 py-4">
          <button type="button" onClick={onClose} className="h-10 rounded-[6px] border border-[#DDDDDD] px-5 text-[13px] font-semibold text-[#666666]">취소</button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="h-10 rounded-[6px] bg-[#724BFD] px-5 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {creating ? "생성 중..." : `생성 (${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
