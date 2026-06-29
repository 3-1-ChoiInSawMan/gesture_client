import { api } from "./axiosInstance";
import { mediaApi } from "./mediaApi";

export interface UserProfile {
  idx?: number;
  id: string;
  userId: string;
  nickname: string;
  email: string;
  profileImage?: string;
  profileUrl?: string;
  statusMessage?: string;
  joinedAt: string;
  createdAt?: string;
  stats?: {
    totalCalls: number;
    friends: number;
    rooms: number;
  };
}

export interface UpdateUserRequest {
  nickname?: string;
  statusMessage?: string;
  profileImage?: File;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}

export const userApi = {
  getMe: async (): Promise<UserProfile> => {
    const { data } = await api.get("/users/me");
    const body = data.data ?? data;
    return {
      ...body,
      profileImage: body.profileUrl ?? body.profileImage,
    } as UserProfile;
  },

  getUser: async (userIdx: string | number): Promise<UserProfile> => {
    const { data } = await api.get(`/users/${userIdx}`);
    const body = data?.data?.user ?? data?.user ?? data?.data ?? data;
    return {
      ...body,
      userId: body.userId ?? body.id ?? "",
      profileImage: body.profileUrl ?? body.profileImage,
      joinedAt: body.joinedAt ?? body.createdAt ?? "",
    } as UserProfile;
  },

  searchUser: async (userId: string): Promise<UserProfile[]> => {
    const { data } = await api.get("/users", { params: { userId } });
    const body = data?.data ?? data;
    return (body?.users ?? body?.searchedUser ?? []) as UserProfile[];
  },

  updateUser: async (body: UpdateUserRequest): Promise<UserProfile> => {
    const profileUrl = body.profileImage
      ? await mediaApi.upload(body.profileImage)
      : undefined;
    const { data } = await api.patch("/users/me", {
      nickname: body.nickname,
      ...(profileUrl ? { profileUrl } : {}),
      statusMessage: body.statusMessage,
    });
    const result = data?.data?.user ?? data?.data ?? data;
    return result as UserProfile;
  },

  updatePassword: async (body: UpdatePasswordRequest): Promise<void> => {
    await api.patch("/users/password", body);
  },

  withdraw: async (): Promise<void> => {
    await api.delete("/users/withdraw");
  },
};
