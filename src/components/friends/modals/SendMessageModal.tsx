"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { FriendUser } from "../types";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { toast } from "react-toastify";
import { friendApi } from "@/api/friendApi";
import { chatRoomApi } from "@/api/chatRoomApi";

interface Props {
  onClose: () => void;
  onCreated: () => Promise<void>;
}

export default function SendMessageModal({ onClose, onCreated }: Props) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  const { rooms, selectRoom } = useChatStore();
  const currentUser = useAuthStore((state) => state.user);

  useEffect(() => {
    friendApi.getFriends().then((items) => {
      setFriends(items.map((friend) => ({
        id: String(friend.idx),
        nickname: friend.nickname,
        username: friend.id,
        profileImage: friend.profileImage,
        status: "friend",
      })));
    }).catch(() => toast.error("친구 목록을 불러오지 못했습니다."));
  }, []);

  const filtered: FriendUser[] = query
    ? friends.filter((u) => u.username.toLowerCase().includes(query.toLowerCase()))
    : [];

  const handleChat = async () => {
    if (!selectedId || creating) return;
    const selectedUser = friends.find((friend) => friend.id === selectedId);
    if (!selectedUser) return;

    const existingRoom = rooms.find(
      (room) => !room.isGroup && room.targetUserIdx === Number(selectedId)
    );
    if (existingRoom) {
      selectRoom(existingRoom.id);
      onClose();
      return;
    }

    setCreating(true);
    try {
      const room = await chatRoomApi.create({
        name: `${currentUser?.nickname ?? "나"}, ${selectedUser.nickname}`,
        participantIds: [Number(selectedId)],
      });
      await onCreated();
      selectRoom(`chat-${room.chatRoomIdx}`);
      toast.success("채팅방 초대를 보냈습니다.");
      onClose();
    } catch {
      toast.error("채팅방을 만들지 못했습니다.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="w-[400px] h-[480px] bg-white rounded-[16px] shadow-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 pt-5 pb-4">
            <h2 className="text-[18px] font-bold text-[#333333]">메시지 보내기</h2>
            <button onClick={onClose} className="text-[#AAAAAA] hover:text-[#333]">
              <X size={18} />
            </button>
          </div>

          <div className="px-6 pb-4">
            <label className="text-[13px] font-semibold text-[#333333] block mb-2">아이디</label>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedId(null);
              }}
              placeholder="아이디를 입력하세요"
              className="w-full h-[44px] border border-[#DDDDDD] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#724BFD] transition-colors"
            />
          </div>

          <div className="px-4 flex-1 overflow-y-auto">
            {filtered.length === 0 && query && (
              <p className="text-center text-[13px] text-[#AAAAAA] py-4">검색 결과가 없습니다.</p>
            )}
            {filtered.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelectedId(u.id)}
                className={`w-full flex items-center gap-3 px-2 py-2.5 rounded-[8px] transition-colors ${
                  selectedId === u.id ? "bg-[#EDE9FF]" : "hover:bg-[#F5F5F5]"
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-[#CCCCCC] flex items-center justify-center text-white text-[14px] font-bold shrink-0">
                  {u.nickname[0]}
                </div>
                <div className="text-left">
                  <p className="text-[14px] font-semibold text-[#333333]">{u.nickname}</p>
                  <p className="text-[12px] text-[#AAAAAA]">@{u.username}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="px-6 py-4">
            <button
              onClick={handleChat}
              disabled={!selectedId || creating}
              className="w-full h-[44px] bg-[#724BFD] text-white text-[14px] font-semibold rounded-[10px] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#5f3de0] transition-colors"
            >
              {creating ? "만드는 중..." : "채팅"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
