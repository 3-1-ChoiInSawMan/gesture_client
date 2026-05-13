import { api } from "./axiosInstance";

export interface CallRoom {
  id: string;
  title: string;
  category?: string;
  isPrivate: boolean;
  currentMembers: number;
  maxMembers: number;
  hostId: string;
  createdAt?: string;
}

export interface CreateRoomRequest {
  title: string;
  category?: string;
  isPrivate: boolean;
  password?: string;
  maxMembers: number;
}

export interface UpdateRoomRequest {
  title?: string;
  category?: string;
  isPrivate?: boolean;
  password?: string;
  maxMembers?: number;
}

export const callRoomApi = {
  getRooms: async (keyword?: string): Promise<CallRoom[]> => {
    const { data } = await api.get("/api/call-rooms", {
      params: keyword ? { keyword } : undefined,
    });
    return data.data as CallRoom[];
  },

  getRoom: async (roomId: string): Promise<CallRoom> => {
    const { data } = await api.get(`/api/call-rooms/${roomId}`);
    return data.data as CallRoom;
  },

  createRoom: async (body: CreateRoomRequest): Promise<CallRoom> => {
    const { data } = await api.post("/api/call-rooms", body);
    return data.data as CallRoom;
  },

  joinRoom: async (roomId: string): Promise<void> => {
    await api.post(`/api/call-rooms/${roomId}/join`);
  },

  updateRoom: async (
    roomId: string,
    body: UpdateRoomRequest
  ): Promise<CallRoom> => {
    const { data } = await api.patch(`/api/call-rooms/${roomId}`, body);
    return data.data as CallRoom;
  },

  deleteRoom: async (roomId: string): Promise<void> => {
    await api.delete(`/api/call-rooms/${roomId}`);
  },
};
