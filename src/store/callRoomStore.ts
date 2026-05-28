import { create } from "zustand";
import { toast } from "react-toastify";
import { callRoomApi, ApiCallRoom } from "@/api/callRoomApi";
import { CallRoomData } from "@/components/home/CallRoom";

const CATEGORY_KO: Record<string, CallRoomData["category"]> = {
  basic: "일반",
  BASIC: "일반",
  meeting: "회의방",
  MEETING: "회의방",
  study: "스터디",
  STUDY: "스터디",
};

// Z 없이 오는 UTC 시간 문자열을 올바르게 파싱
function parseUtc(str: string) {
  return new Date(str.endsWith("Z") || str.includes("+") ? str : str + "Z");
}

function toCallRoomData(room: ApiCallRoom): CallRoomData {
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

interface CallRoomStore {
  rooms: CallRoomData[];
  loading: boolean;
  totalPages: number;
  totalElements: number;
  fetchRooms: (params?: { page?: number; size?: number; sort?: string }) => Promise<void>;
}

export const useCallRoomStore = create<CallRoomStore>((set, get) => ({
  rooms: [],
  loading: false,
  totalPages: 1,
  totalElements: 0,

  fetchRooms: async (params) => {
    if (get().loading) return;

    set({ loading: true });
    try {
      const result = await callRoomApi.getRooms(params);
      set({
        rooms: result.rooms.map(toCallRoomData),
        totalPages: result.totalPages,
        totalElements: result.totalElements,
      });
    } catch {
      toast.error("통화방 목록을 불러오지 못했습니다.");
    } finally {
      set({ loading: false });
    }
  },
}));
