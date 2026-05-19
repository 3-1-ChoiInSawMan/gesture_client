import { api } from "./axiosInstance";

export interface Friend {
  id: string;
  userId: string;
  nickname: string;
  profileImage?: string;
  statusMessage?: string;
}

export interface FriendRequest {
  requestId: number;
  username: string;
  userId: string;
  sentAt: string;
}

export const friendApi = {
  getFriends: async (): Promise<Friend[]> => {
    const { data } = await api.get("/friend/list");
    return (data.data ?? []) as Friend[];
  },

  getRequests: async (): Promise<FriendRequest[]> => {
    const { data } = await api.get("/friend");
    const body = data.data ?? data;
    const requests: FriendRequest[] = Object.values(body?.requests ?? body ?? {});
    return requests;
  },

  sendRequest: async (userId: string): Promise<void> => {
    await api.post("/friend", { userid: userId });
  },

  acceptRequest: async (requestId: string | number): Promise<void> => {
    await api.post("/friend/accept", null, {
      params: { request_id: requestId },
    });
  },

  denyRequest: async (requestId: string | number): Promise<void> => {
    await api.post("/friend/deny", null, {
      params: { request_id: requestId },
    });
  },

  deleteFriend: async (userId: string): Promise<void> => {
    await api.delete("/friend", {
      params: { userid: userId },
    });
  },

  inviteFriend: async (
    targetUserId: string,
    targetCallRoom: string
  ): Promise<void> => {
    await api.post("/friend/invite", { targetUserId, targetCallRoom });
  },
};
