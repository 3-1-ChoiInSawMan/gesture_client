import { api } from "./axiosInstance";

export interface ApiCallRoom {
  roomId: number;
  title: string;
  thumbnailUrl?: string;
  host: {
    userId: number;
    profileUrl?: string;
    nickname: string;
  };
  currentParticipants: number;
  startedAt: string;
}

export interface CreateRoomRequest {
  title: string;
  description?: string;
  maxParticipant: number;
  isPublic: boolean;
  thumbnailUrl?: string;
}

export interface CreateRoomResponse {
  roomId: number;
}

export interface EndMinutesSummary {
  minutesId: number;
  endedAt: string;
  summary: {
    title: string;
    summary: string;
    decisions: string[];
    todos: string[];
  };
}

export const callRoomApi = {
  getRooms: async (params?: {
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<ApiCallRoom[]> => {
    const { data } = await api.get("/call-rooms", { params });
    return (data.data ?? data) as ApiCallRoom[];
  },

  getRoom: async (roomId: string | number): Promise<ApiCallRoom> => {
    const { data } = await api.get(`/call-rooms/${roomId}`);
    return data.data as ApiCallRoom;
  },

  createRoom: async (body: CreateRoomRequest): Promise<CreateRoomResponse> => {
    const { data } = await api.post("/call-rooms", body);
    return data.data as CreateRoomResponse;
  },

  joinRoom: async (
    roomId: string | number,
    password?: string
  ): Promise<void> => {
    await api.post(
      `/call-rooms/${roomId}/join`,
      password ? { password } : undefined
    );
  },

  updateRoom: async (
    roomId: string | number,
    body: Partial<CreateRoomRequest>
  ): Promise<void> => {
    await api.patch(`/call-rooms/${roomId}`, body);
  },

  deleteRoom: async (roomId: string | number): Promise<void> => {
    await api.delete(`/call-rooms/${roomId}`);
  },
};
