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
    set({ loading: true });
    try {
      const apiRooms = await callRoomApi.getRooms(params);
      const apiMapped = apiRooms.map(toCallRoomData);
      // merge: API rooms first, then mock rooms that don't conflict
      const apiIds = new Set(apiMapped.map((r) => r.id));
      const uniqueMock = MOCK_ROOMS.filter((r) => !apiIds.has(r.id));
      set({ rooms: [...apiMapped, ...uniqueMock] });
    } catch {
      // fall back to mock data on error
      set({ rooms: MOCK_ROOMS });
    } finally {
      set({ loading: false });
    }
  },
}));
