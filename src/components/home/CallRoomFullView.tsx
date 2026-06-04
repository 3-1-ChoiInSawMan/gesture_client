"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "react-toastify";
import CallRoom, { CallRoomData } from "./CallRoom";
import JoinRoomModal from "@/components/callroom/JoinRoomModal";
import JoinPrivateRoomModal from "@/components/callroom/JoinPrivateRoomModal";
import { useCallRoomStore } from "@/store/callRoomStore";
import { useAuthStore } from "@/store/authStore";
import { callRoomApi } from "@/api/callRoomApi";

const PAGE_SIZE = 20;

const SORT_OPTIONS = [
  { label: "최신순", value: "createdAt,desc" },
  { label: "오래된순", value: "createdAt,asc" },
  { label: "인원많은순", value: "maxParticipant,desc" },
] as const;

interface Props {
  title: string;
  onClose: () => void;
  username: string;
}

export default function CallRoomFullView({ title, onClose, username }: Props) {
  const router = useRouter();
  const { rooms, fetchRooms, totalPages, loading } = useCallRoomStore();
  const { user } = useAuthStore();
  const [selectedRoom, setSelectedRoom] = useState<CallRoomData | null>(null);
  const [joining, setJoining] = useState(false);
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<string>(SORT_OPTIONS[0].value);

  useEffect(() => {
    fetchRooms({ page, size: PAGE_SIZE, sort });
  }, [page, sort, fetchRooms]);

  const handleJoin = async (password?: string) => {
    if (!selectedRoom) return;
    setJoining(true);
    try {
      await callRoomApi.joinRoom(selectedRoom.id, password);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status !== 409) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message ?? "통화방 참여에 실패했습니다.";
        toast.error(message);
        setJoining(false);
        return;
      }
      // 409: 이미 참여 중 → 그냥 입장
    }
    sessionStorage.setItem("currentRoomId", String(selectedRoom.id));
    router.push("/room");
    setSelectedRoom(null);
    setJoining(false);
  };

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i);
  const visiblePages = pageNumbers.filter(
    (p) => p === 0 || p === totalPages - 1 || Math.abs(p - page) <= 2
  );

  return (
    <div className="flex flex-col gap-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <p className="text-[18px] font-bold text-[#333333]">{title}</p>
        <button
          onClick={onClose}
          className="flex items-center gap-0.5 text-[13px] text-[#724BFD] font-medium"
        >
          접기
          <ChevronRight size={15} className="text-[#724BFD] rotate-180" />
        </button>
      </div>

      {/* 정렬 */}
      <div className="flex items-center gap-2">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setSort(opt.value); setPage(0); }}
            className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
              sort === opt.value
                ? "bg-[#724BFD] text-white"
                : "bg-[#F5F5F5] text-[#555555] hover:bg-[#EEEEEE]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 그리드 */}
      {loading ? (
        <p className="text-[13px] text-[#AAAAAA]">불러오는 중...</p>
      ) : rooms.length === 0 ? (
        <p className="text-[13px] text-[#AAAAAA]">진행 중인 통화방이 없습니다.</p>
      ) : (
        <div className="grid grid-cols-5 gap-4">
          {rooms.map((room) => (
            <CallRoom
              key={room.id}
              room={room}
              onClick={(r) => {
                if (!user) {
                  toast.error("로그인이 필요한 서비스입니다.");
                  router.push("/auth/login");
                  return;
                }
                setSelectedRoom(r);
              }}
            />
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] disabled:opacity-30"
          >
            <ChevronLeft size={16} />
          </button>

          {visiblePages.map((p, idx) => {
            const prev = visiblePages[idx - 1];
            const showEllipsis = prev !== undefined && p - prev > 1;
            return (
              <span key={p} className="flex items-center gap-1">
                {showEllipsis && (
                  <span className="w-8 text-center text-[13px] text-[#AAAAAA]">…</span>
                )}
                <button
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-full text-[13px] font-medium transition-colors ${
                    p === page
                      ? "bg-[#724BFD] text-white"
                      : "hover:bg-[#F5F5F5] text-[#555555]"
                  }`}
                >
                  {p + 1}
                </button>
              </span>
            );
          })}

          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F5F5] disabled:opacity-30"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {selectedRoom && !selectedRoom.isPrivate && (
        <JoinRoomModal
          roomTitle={selectedRoom.title}
          isPrivate={false}
          onClose={() => setSelectedRoom(null)}
          onJoin={() => handleJoin()}
          loading={joining}
        />
      )}
      {selectedRoom && selectedRoom.isPrivate && (
        <JoinPrivateRoomModal
          roomTitle={selectedRoom.title}
          onClose={() => setSelectedRoom(null)}
          onJoin={(code) => handleJoin(code)}
          loading={joining}
        />
      )}
    </div>
  );
}
