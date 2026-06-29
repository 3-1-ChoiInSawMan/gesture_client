"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { toast } from "react-toastify";
import { chatRoomApi } from "@/api/chatRoomApi";
import { friendApi, Friend } from "@/api/friendApi";
import { useChatStore } from "@/store/chatStore";

interface Props {
  onClose: () => void;
  onCreated: () => Promise<void>;
}

export default function CreateChatRoomModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const selectRoom = useChatStore((state) => state.selectRoom);

  useEffect(() => {
    friendApi
      .getFriends()
      .then(setFriends)
      .catch(() => toast.error("친구 목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !creating) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [creating, onClose]);

  const imageName = useMemo(() => image?.name ?? "", [image]);

  const toggleFriend = (userIdx: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(userIdx)) next.delete(userIdx);
      else next.add(userIdx);
      return next;
    });
  };

  const handleImage = (event: ChangeEvent<HTMLInputElement>) => {
    setImage(event.target.files?.[0] ?? null);
  };

  const handleCreate = async () => {
    const roomName = name.trim();
    if (!roomName || selectedIds.size === 0 || creating) return;

    setCreating(true);
    try {
      const imageUuid = image ? await chatRoomApi.uploadFile(image) : undefined;
      const room = await chatRoomApi.create({
        name: roomName,
        participantIds: [...selectedIds],
        ...(imageUuid ? { imageUuid } : {}),
      });
      await onCreated();
      selectRoom(`chat-${room.chatRoomIdx}`);
      toast.success("채팅방을 만들고 친구에게 초대를 보냈습니다.");
      onClose();
    } catch {
      toast.error("채팅방을 만들지 못했습니다.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={creating ? undefined : onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="flex max-h-[640px] w-full max-w-[440px] flex-col overflow-hidden rounded-[8px] bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-[#EEEEEE] px-6 py-4">
            <h2 className="text-[18px] font-bold text-[#333333]">그룹 채팅방 만들기</h2>
            <button onClick={onClose} disabled={creating} title="닫기" className="text-[#888888] hover:text-[#333333]">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4 px-6 py-5">
            <div>
              <label className="mb-2 block text-[13px] font-semibold text-[#333333]">채팅방 이름</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={50}
                placeholder="채팅방 이름을 입력하세요"
                className="h-11 w-full rounded-[8px] border border-[#DDDDDD] px-3 text-[14px] outline-none focus:border-[#724BFD]"
              />
            </div>

            <div>
              <span className="mb-2 block text-[13px] font-semibold text-[#333333]">채팅방 이미지 (선택)</span>
              <label className="flex h-10 cursor-pointer items-center gap-2 rounded-[8px] border border-[#DDDDDD] px-3 text-[13px] text-[#666666] hover:border-[#724BFD]">
                <ImagePlus size={17} />
                <span className="truncate">{imageName || "이미지 선택"}</span>
                <input type="file" accept="image/*" onChange={handleImage} className="hidden" />
              </label>
            </div>

            <div>
              <p className="mb-2 text-[13px] font-semibold text-[#333333]">
                초대할 친구 <span className="text-[#724BFD]">{selectedIds.size}</span>
              </p>
              <div className="max-h-[260px] overflow-y-auto rounded-[8px] border border-[#EEEEEE]">
                {loading && <p className="py-8 text-center text-[13px] text-[#999999]">불러오는 중...</p>}
                {!loading && friends.length === 0 && (
                  <p className="py-8 text-center text-[13px] text-[#999999]">초대할 수 있는 친구가 없습니다.</p>
                )}
                {friends.map((friend) => (
                  <label key={friend.idx} className="flex cursor-pointer items-center gap-3 border-b border-[#F2F2F2] px-3 py-3 last:border-0 hover:bg-[#F8F7FF]">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(friend.idx)}
                      onChange={() => toggleFriend(friend.idx)}
                      className="accent-[#724BFD]"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-[#333333]">{friend.nickname}</p>
                      <p className="truncate text-[12px] text-[#999999]">@{friend.id}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-[#EEEEEE] px-6 py-4">
            <button
              onClick={handleCreate}
              disabled={!name.trim() || selectedIds.size === 0 || creating}
              className="h-11 w-full rounded-[8px] bg-[#724BFD] text-[14px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {creating ? "만드는 중..." : "채팅방 만들기"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
