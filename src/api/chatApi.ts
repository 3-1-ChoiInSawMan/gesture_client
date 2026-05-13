import { api } from "./axiosInstance";

export interface ChatRoomResponse {
  id: string;
  name: string;
  isGroup: boolean;
  members: { id: string; nickname: string; userId: string }[];
  lastMessage?: string;
  lastMessageTime?: string;
}

export interface CreateChatRequest {
  name?: string;
  memberIds: string[];
}

export const chatApi = {
  createChat: async (body: CreateChatRequest): Promise<ChatRoomResponse> => {
    const { data } = await api.post("/api/chat", body);
    return data.data as ChatRoomResponse;
  },
};
