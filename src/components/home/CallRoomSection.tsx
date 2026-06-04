"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft, Plus } from "lucide-react";
import { toast } from "react-toastify";
import CallRoom, { CallRoomData } from "./CallRoom";
import CreateRoomModal from "@/components/callroom/CreateRoomModal";
import JoinRoomModal from "@/components/callroom/JoinRoomModal";
import JoinPrivateRoomModal from "@/components/callroom/JoinPrivateRoomModal";
import { useCallRoomStore } from "@/store/callRoomStore";
import { useAuthStore } from "@/store/authStore";
import { callRoomApi, ApiCallRoom } from "@/api/callRoomApi";

const CATEGORIES = ["전체", "일반", "회의방", "스터디"];

const SORT_OPTIONS = [
  { label: "최신순", value: "createdAt,desc" },
  { label: "오래된순", value: "createdAt,asc" },
  { label: "인원많은순", value: "maxParticipant,desc" },
] as const;

const PAGE_SIZE = 20;

const CATEGORY_KO: Record<string, CallRoomData["category"]> = {
  basic: "일반", BASIC: "일반",
  meeting: "회의방", MEETING: "회의방",
  study: "스터디", STUDY: "스터디",
};

function parseUtc(str: string) {
  return new Date(str.endsWith("Z") || str.includes("+") ? str : str + "Z");
}

function mapRoom(room: ApiCallRoom): CallRoomData {
  const minutesAgo = room.createdAt
    ? Math.floor((Date.now() - parseUtc(room.createdAt).getTime()) / 60000)
    : 0;
  return {
    id: room.roomIdx,
    username: room.host?.userName ?? "알 수 없음",
    profileImage: room.host?.profileUrl ?? null,
    title: room.title,
    category: CATEGORY_KO[room.category ?? ""] ?? "일반",
    isPrivate: !room.isPublic,
    participants: room.currentParticipant,
    maxParticipants: room.maxParticipant,
    minutesAgo,
  };
}

interface Props {
  title: string;
  onViewAll?: () => void;
  rows?: number;
  username: string;
  showFilter?: boolean;
  showPagination?: boolean;
  defaultSort?: string;
  searchQuery?: string;
}

export default function CallRoomSection({
  title,
  onViewAll,
  rows = 1,
  username,
  showFilter = false,
  showPagination = false,
  defaultSort = "createdAt,desc",
  searchQuery = "",
}: Props) {
  const router = useRouter();
  // 페이지네이션 모드: 스토어 사용 / 프리뷰 모드: 로컬 state
  const { rooms: storeRooms, fetchRooms, totalPages, loading: storeLoading } = useCallRoomStore();
  const { user } = useAuthStore();

  const [localRooms, setLocalRooms] = useState<CallRoomData[]>([]);
  const [localLoading, setLocalLoading] = useState(false);

  const [activeCategory, setActiveCategory] = useState("전체");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<CallRoomData | null>(null);
  const [joining, setJoining] = useState(false);
  const [searchResults, setSearchResults] = useState<CallRoomData[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<string>(defaultSort);

  // 프리뷰 모드: 로컬 fetch (각 섹션이 독립적으로 동작)
  useEffect(() => {
    if (showPagination || searchQuery) return;
    setLocalLoading(true);
    callRoomApi
      .getRooms({ page: 0, size: rows * 5, sort: defaultSort })
      .then((res) => setLocalRooms(res.rooms.map(mapRoom)))
      .catch(() => toast.error("통화방 목록을 불러오지 못했습니다."))
      .finally(() => setLocalLoading(false));
  }, [showPagination, searchQuery, rows, defaultSort]);

  // 페이지네이션 모드: 스토어 fetch
  useEffect(() => {
    if (!showPagination || searchQuery) return;
    fetchRooms({ page, size: PAGE_SIZE, sort });
  }, [fetchRooms, showPagination, searchQuery, page, sort]);

  // 검색
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    callRoomApi
      .searchRooms(searchQuery.trim())
      .then((data) => setSearchResults(data.map(mapRoom)))
      .catch(() => toast.error("검색에 실패했습니다."))
      .finally(() => setSearchLoading(false));
  }, [searchQuery]);

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
    // 내가 만든 방이 아닌 곳에 참여할 때 host_call_room_id 초기화
    // (이전에 만든 방 ID가 우연히 일치해 deleteRoom이 호출되는 것 방지)
    if (localStorage.getItem("host_call_room_id") !== String(selectedRoom.id)) {
      localStorage.removeItem("host_call_room_id");
    }
    router.push("/room");
    setSelectedRoom(null);
    setJoining(false);
  };

  const handleRoomClick = (r: CallRoomData) => {
    if (!user) {
      toast.error("로그인이 필요한 서비스입니다.");
      router.push("/auth/login");
      return;
    }
    setSelectedRoom(r);
  };

  // 표시할 방 목록
  const rooms = showPagination ? storeRooms : localRooms;
  const loading = showPagination ? storeLoading : localLoading;

  const baseRooms = searchQuery ? searchResults : rooms;
  const filtered =
    searchQuery || activeCategory === "전체"
      ? baseRooms
      : baseRooms.filter((r) => r.category === activeCategory);
  const displayed = showPagination ? filtered : filtered.slice(0, rows * 5);

  // 페이지 번호
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i);
  const visiblePages = pageNumbers.filter(
    (p) => p === 0 || p === totalPages - 1 || Math.abs(p - page) <= 2
  );

  return (
    <div className="flex flex-col gap-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <p className="text-[18px] font-bold text-[#333333]">{title}</p>
        {onViewAll && !searchQuery && (
          <button
            onClick={onViewAll}
            className="flex items-center gap-0.5 text-[13px] text-[#724BFD] font-medium"
          >
            전체보기
            <ChevronRight size={15} className="text-[#724BFD]" />
          </button>
        )}
      </div>

      {/* 카테고리 필터 + 정렬 + 통화방 생성 */}
      {showFilter && !searchQuery && (
        <div className="flex items-center gap-2 flex-wrap">
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
          {showPagination && (
            <>
              <div className="w-px h-4 bg-[#E0E0E0] mx-1" />
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
            </>
          )}
          <button
            onClick={() => {
              if (!user) {
                toast.error("로그인이 필요합니다.");
                router.push("/auth/login");
                return;
              }
              setIsCreateModalOpen(true);
            }}
            className="ml-auto flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#724BFD] text-white text-[13px] font-medium hover:bg-[#5f3de0] transition-colors"
          >
            <Plus size={14} />
            통화방 생성
          </button>
        </div>
      )}

      {/* 로딩 / 결과 없음 / 그리드 */}
      {searchLoading || loading ? (
        <p className="text-[13px] text-[#AAAAAA]">{searchLoading ? "검색 중..." : "불러오는 중..."}</p>
      ) : searchQuery && displayed.length === 0 ? (
        <p className="text-[13px] text-[#AAAAAA]">검색 결과가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-5 gap-4">
          {displayed.map((room) => (
            <CallRoom key={room.id} room={room} onClick={handleRoomClick} />
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {showPagination && !searchQuery && totalPages > 1 && (
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

      {isCreateModalOpen && (
        <CreateRoomModal onClose={() => setIsCreateModalOpen(false)} />
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
