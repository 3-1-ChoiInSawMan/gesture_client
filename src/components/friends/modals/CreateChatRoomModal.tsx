"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Camera } from "lucide-react";
import { FriendUser } from "../types";
import { ALL_USERS } from "../mockData";
import { useChatStore } from "@/store/chatStore";
import { toast } from "react-toastify";

interface Props {
  onClose: () => void;
}

export default function CreateChatRoomModal({ onClose }: Props) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const [roomName, setRoomName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [friendQuery, setFriendQuery] = useState("");
  const [addedFriends, setAddedFriends] = useState<FriendUser[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { createRoom } = useChatStore();

  const friendResults = friendQuery
    ? ALL_USERS.filter(
        (u) =>
          u.username.toLowerCase().includes(friendQuery.toLowerCase()) &&
          !addedFriends.find((f) => f.id === u.id)
      )
    : [];

  const handleAvatarChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setAvatarPreview(URL.createObjectURL(file));
  }, []);

  const addFriend = (user: FriendUser) => {
    setAddedFriends((prev) => [...prev, user]);
    setFriendQuery("");
  };

  const removeFriend = (id: string) => {
    setAddedFriends((prev) => prev.filter((f) => f.id !== id));
  };

  const handleCreate = () => {
    if (!roomName.trim()) {
      toast.error("방 이름을 입력해주세요.");
      return;
    }
    createRoom(
      roomName.trim(),
      addedFriends.map((f) => f.id),
      addedFriends.map((f) => f.nickname),
      avatarPreview ?? undefined
    );
    toast.success("채팅방이 생성되었습니다.");
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="flex items-stretch gap-4">
        {/* 채팅방 설정 패널 */}
        <div className="w-[380px] bg-white rounded-[16px] shadow-xl px-6 py-6 flex flex-col gap-4">
          <h2 className="text-[18px] font-bold text-[#333333] text-center">채팅방 생성</h2>

          {/* 방 아바타 */}
          <div className="flex justify-center">
            <div className="relative">
              <div
                className="w-16 h-16 rounded-full overflow-hidden bg-[#CCCCCC] cursor-pointer"
                onClick={() => fileRef.current?.click()}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="방 이미지" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full" />
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-6 h-6 bg-[#724BFD] rounded-full flex items-center justify-center"
              >
                <Camera size={12} className="text-white" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
          </div>

          {/* 방 이름 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-[#333333]">방 이름</label>
            <input
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="방 이름"
              className="w-full h-[42px] border border-[#DDDDDD] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#724BFD] transition-colors"
            />
          </div>

          {/* 추가된 친구 태그 */}
          {addedFriends.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-[#333333]">추가된 친구</label>
              <div className="flex flex-wrap gap-2">
                {addedFriends.map((f) => (
                  <span
                    key={f.id}
                    className="flex items-center gap-1 bg-[#F0EEFF] text-[#724BFD] text-[12px] px-2.5 py-1 rounded-full"
                  >
                    @{f.username}
                    <button onClick={() => removeFriend(f.id)} className="ml-0.5">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-3 mt-2">
            <button
              onClick={onClose}
              className="flex-1 h-[42px] bg-[#F5F5F5] text-[#333333] text-[14px] font-semibold rounded-[10px] hover:bg-[#EEEEEE] transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleCreate}
              className="flex-1 h-[42px] bg-[#724BFD] text-white text-[14px] font-semibold rounded-[10px] hover:bg-[#5f3de0] transition-colors"
            >
              생성
            </button>
          </div>
        </div>

        {/* 친구 검색 패널 */}
        <div className="w-[300px] bg-white rounded-[16px] shadow-xl px-6 py-6 flex flex-col gap-4">
          <h2 className="text-[18px] font-bold text-[#333333]">친구 검색</h2>
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-[#333333]">아이디</label>
            <input
              value={friendQuery}
              onChange={(e) => setFriendQuery(e.target.value)}
              placeholder="아이디"
              className="w-full h-[42px] border border-[#DDDDDD] rounded-[10px] px-4 text-[14px] outline-none focus:border-[#724BFD] transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
            {friendQuery && friendResults.length === 0 && (
              <p className="text-center text-[13px] text-[#AAAAAA] py-4">검색 결과가 없습니다.</p>
            )}
            {friendResults.map((u) => (
              <div key={u.id} className="flex items-center gap-2 py-2">
                <div className="w-8 h-8 rounded-full bg-[#CCCCCC] flex items-center justify-center text-white text-[13px] font-bold shrink-0">
                  {u.nickname[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#333333]">{u.nickname}</p>
                  <p className="text-[11px] text-[#AAAAAA]">@{u.username}</p>
                </div>
                <button
                  onClick={() => addFriend(u)}
                  className="shrink-0 h-[28px] px-3 bg-[#724BFD] text-white text-[12px] font-medium rounded-[6px] hover:bg-[#5f3de0] transition-colors"
                >
                  추가
                </button>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
