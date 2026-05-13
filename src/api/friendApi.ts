import { api } from "./axiosInstance";

export interface Friend {
  id: string;
  userId: string;
  nickname: string;
  profileImage?: string;
  statusMessage?: string;
}

export interface FriendRequest {
  requestId: string;
  fromUserId: string;
  fromNickname: string;
  createdAt: string;
}

export const friendApi = {
  getFriends: async (): Promise<Friend[]> => {
    const { data } = await api.get("/api/friend");
    return data.data as Friend[];
  },

  sendRequest: async (userId: string): Promise<void> => {
    await api.post("/api/friend", { userId });
  },

  acceptRequest: async (requestId: string): Promise<void> => {
    await api.post("/api/friend/accept", null, {
      params: { request_id: requestId },
    });
  },

  denyRequest: async (requestId: string): Promise<void> => {
    await api.post("/api/friend/deny", null, {
      params: { request_id: requestId },
    });
  },

  deleteFriend: async (userId: string): Promise<void> => {
    await api.delete("/api/friend", { data: { userId } });
  },

  inviteFriend: async (
    userId: string,
    roomId: string
  ): Promise<void> => {
    await api.post("/api/friend/invite", { userId, roomId });
  },
};
