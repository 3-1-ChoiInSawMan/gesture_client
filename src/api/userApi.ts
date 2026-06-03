import { api } from "./axiosInstance";

export interface UserProfile {
  id: string;
  userId: string;
  nickname: string;
  email: string;
  profileImage?: string;
  profileUrl?: string;
  statusMessage?: string;
  joinedAt: string;
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

  getUser: async (userId: string): Promise<UserProfile> => {
    const { data } = await api.get(`/users/${userId}`);
    const body = data?.data?.user ?? data?.user ?? data?.data ?? data;
    return body as UserProfile;
  },

  searchUser: async (userId: string): Promise<UserProfile[]> => {
    const { data } = await api.get("/users", { params: { userId } });
    const body = data.data ?? data;
    return (body?.searchedUser ?? []) as UserProfile[];
  },

  updateUser: async (body: UpdateUserRequest): Promise<UserProfile> => {
    // TODO: 이미지 필드명 백엔드 확인 후 활성화
    const { data } = await api.patch("/users/me", {
      nickname: body.nickname,
      statusMessage: body.statusMessage,
    });
    return data.data as UserProfile;
  },

  updatePassword: async (body: UpdatePasswordRequest): Promise<void> => {
    await api.patch("/users/password", body);
  },

  requestWithdraw: async (password: string): Promise<void> => {
    await api.delete("/users/withdraw", { data: { password } });
  },

  confirmWithdraw: async (confirmationCode: string): Promise<void> => {
    await api.get("/users/withdraw", {
      params: { "confirmation-code": confirmationCode },
    });
  },
};
