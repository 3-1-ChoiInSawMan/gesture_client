"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus } from "lucide-react";
import CallRoom, { CallRoomData } from "./CallRoom";
import CreateRoomModal from "@/components/callroom/CreateRoomModal";
import JoinRoomModal from "@/components/callroom/JoinRoomModal";
import JoinPrivateRoomModal from "@/components/callroom/JoinPrivateRoomModal";
import { useCallRoomStore } from "@/store/callRoomStore";

const CATEGORIES = ["전체", "일반", "회의방", "스터디"];

interface Props {
  title: string;
  onViewAll?: () => void;
  rows?: number;
  username: string;
  showFilter?: boolean;
}

export default function CallRoomSection({
  title,
  onViewAll,
  rows = 1,
  username,
  showFilter = false,
}: Props) {
  const router = useRouter();
  const { rooms, fetchRooms } = useCallRoomStore();
  const [activeCategory, setActiveCategory] = useState("전체");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<CallRoomData | null>(null);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleRoomClick = (room: CallRoomData) => {
    setSelectedRoom(room);
  };

  const handleJoin = () => {
    if (!selectedRoom) return;
    router.push(`/room/${selectedRoom.id}`);
    setSelectedRoom(null);
  };

  const filtered =
    activeCategory === "전체"
      ? rooms
      : rooms.filter((r) => r.category === activeCategory);

  const displayed = filtered.slice(0, rows * 5);

  return (
    <div className="flex flex-col gap-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <p className="text-[18px] font-bold text-[#333333]">{title}</p>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-0.5 text-[13px] text-[#724BFD] font-medium"
          >
            전체보기
            <ChevronRight size={15} className="text-[#724BFD]" />
          </button>
        )}
      </div>

      {/* 카테고리 필터 + 통화방 생성 */}
      {showFilter && (
        <div className="flex items-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-[#724BFD] text-white"
                  : "bg-[#F5F5F5] text-[#555555] hover:bg-[#EEEEEE]"
              }`}
            >
              {cat}
            </button>
          ))}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#724BFD] text-white text-[13px] font-medium hover:bg-[#5f3de0] transition-colors"
          >
            <Plus size={14} />
            통화방 생성
          </button>
        </div>
      )}

      {/* 그리드 */}
      <div className="grid grid-cols-5 gap-4">
        {displayed.map((room) => (
          <CallRoom key={room.id} room={room} onClick={handleRoomClick} />
        ))}
      </div>

      {/* 통화방 생성 모달 */}
      {isCreateModalOpen && (
        <CreateRoomModal onClose={() => setIsCreateModalOpen(false)} />
      )}

      {/* 참여 확인 모달 - 공개방 */}
      {selectedRoom && !selectedRoom.isPrivate && (
        <JoinRoomModal
          roomTitle={selectedRoom.title}
          isPrivate={false}
          onClose={() => setSelectedRoom(null)}
          onJoin={handleJoin}
        />
      )}

      {/* 참여 확인 모달 - 비공개방 */}
      {selectedRoom && selectedRoom.isPrivate && (
        <JoinPrivateRoomModal
          roomTitle={selectedRoom.title}
          onClose={() => setSelectedRoom(null)}
          onJoin={handleJoin}
        />
      )}
    </div>
  );
}
