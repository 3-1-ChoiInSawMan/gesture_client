import { api } from "./axiosInstance";

export interface Friend {
  idx: number;
  id: string;
  userId: string;
  nickname: string;
  profileImage?: string;
  statusMessage?: string;
}

export interface FriendRequest {
  friendshipIdx: number;
  requestId: number;
  userIdx: number;
  username: string;
  userId: string;
  nickname: string;
  sentAt: string;
}

const normalizeFriends = (value: unknown): Friend[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      idx: Number(item.friendIdx ?? item.userIdx ?? item.idx ?? 0),
      id: String(item.friendId ?? item.userId ?? item.id ?? ""),
      userId: String(item.friendId ?? item.userId ?? item.id ?? ""),
      nickname: String(item.friendNickname ?? item.nickname ?? item.friendId ?? ""),
      profileImage: String(item.profileUrl ?? item.profileImage ?? "") || undefined,
      statusMessage: String(item.statusMessage ?? "") || undefined,
    }))
    .filter((friend) => friend.idx > 0 || friend.id);
};

const normalizeRequests = (value: unknown): FriendRequest[] => {
  const list = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? Object.values(value)
      : [];
  return list
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => {
      const friendshipIdx = Number(
        item.friendshipIdx ?? item.requestId ?? item.friendship_id ?? item.idx ?? 0
      );
      return {
        friendshipIdx,
        requestId: friendshipIdx,
        userIdx: Number(item.userIdx ?? item.fromUserIdx ?? item.senderIdx ?? 0),
        username: String(item.userId ?? item.username ?? item.senderId ?? ""),
        userId: String(item.userId ?? item.username ?? item.senderId ?? ""),
        nickname: String(item.nickname ?? item.senderNickname ?? item.userId ?? ""),
        sentAt: String(item.sentAt ?? item.createdAt ?? ""),
      };
    })
    .filter((request) => request.friendshipIdx > 0);
};

export const friendApi = {
  getFriends: async (): Promise<Friend[]> => {
    const { data } = await api.get("/friend");
    return normalizeFriends(data.data ?? data);
  },

  getCount: async (): Promise<number> => {
    const { data } = await api.get("/friend/count");
    return Number(data?.data?.count ?? data?.count ?? 0);
  },

  getRequests: async (): Promise<FriendRequest[]> => {
    const { data } = await api.get("/friend/pending");
    const body = data.data ?? data;
    return normalizeRequests(body?.requests ?? body);
  },

  sendRequest: async (userIdx: number): Promise<void> => {
    await api.post("/friend", undefined, { params: { userIdx } });
  },

  acceptRequest: async (friendshipIdx: string | number): Promise<void> => {
    await api.post("/friend/accept", undefined, { params: { friendshipIdx } });
  },

  denyRequest: async (friendshipIdx: string | number): Promise<void> => {
    await api.post("/friend/reject", undefined, { params: { friendshipIdx } });
  },

  deleteFriend: async (userIdx: string | number): Promise<void> => {
    await api.delete("/friend", { params: { userIdx } });
  },

  inviteFriend: async (
    targetUserId: string,
    targetCallRoom: string
  ): Promise<void> => {
    await api.post("/friend/invite", { targetUserId, targetCallRoom });
  },
};
