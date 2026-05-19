import { create } from "zustand";
import { callRoomApi, ApiCallRoom } from "@/api/callRoomApi";
import { CallRoomData } from "@/components/home/CallRoom";
import { MOCK_ROOMS } from "@/components/home/mockRooms";

function toCallRoomData(room: ApiCallRoom): CallRoomData {
  const minutesAgo = room.startedAt
    ? Math.floor((Date.now() - new Date(room.startedAt).getTime()) / 60000)
    : 0;
  return {
    id: room.roomId,
    username: room.host.nickname,
    title: room.title,
    category: "일반",
    isPrivate: false,
    participants: room.currentParticipants,
    minutesAgo,
  };
}

interface CallRoomStore {
  rooms: CallRoomData[];
  loading: boolean;
  fetchRooms: (params?: { page?: number; size?: number }) => Promise<void>;
}

export const useCallRoomStore = create<CallRoomStore>((set) => ({
  rooms: MOCK_ROOMS,
  loading: false,

  fetchRooms: async (params) => {
    // 로그인 상태가 아니면 목데이터만 사용
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!token) {
      set({ rooms: MOCK_ROOMS });
      return;
    }

    set({ loading: true });
    try {
      const apiRooms = await callRoomApi.getRooms(params);
      const apiMapped = apiRooms.map(toCallRoomData);
      const apiIds = new Set(apiMapped.map((r) => r.id));
      const uniqueMock = MOCK_ROOMS.filter((r) => !apiIds.has(r.id));
      set({ rooms: [...apiMapped, ...uniqueMock] });
    } catch {
      set({ rooms: MOCK_ROOMS });
    } finally {
      set({ loading: false });
    }
  },
}));
