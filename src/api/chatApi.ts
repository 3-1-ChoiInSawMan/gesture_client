import { api } from "./axiosInstance";

export interface ChatRoomResponse {
  [key: string]: unknown;
}

export interface CreateChatRequest {
  roomName: string;
  members: { userId: number }[];
}

export const chatApi = {
  createChat: async (body: CreateChatRequest): Promise<ChatRoomResponse> => {
    const { data } = await api.post("/chat", body);
    return (data.data ?? data) as ChatRoomResponse;
  },
};
