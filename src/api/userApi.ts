import { api } from "./axiosInstance";

export interface UserProfile {
  id: string;
  userId: string;
  nickname: string;
  email: string;
  profileImage?: string;
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
    return data.data as UserProfile;
  },

  getUser: async (userId: string): Promise<UserProfile> => {
    const { data } = await api.get(`/users/${userId}`);
    return data.data as UserProfile;
  },

  searchUser: async (userId: string): Promise<UserProfile[]> => {
    const { data } = await api.get("/users", { params: { userId } });
    return data.data as UserProfile[];
  },

  updateUser: async (body: UpdateUserRequest): Promise<UserProfile> => {
    const formData = new FormData();
    if (body.nickname) formData.append("nickname", body.nickname);
    if (body.statusMessage !== undefined)
      formData.append("statusMessage", body.statusMessage);
    if (body.profileImage) formData.append("profileImage", body.profileImage);

    const { data } = await api.patch("/users", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data as UserProfile;
  },

  updatePassword: async (body: UpdatePasswordRequest): Promise<void> => {
    await api.patch("/users/password", body);
  },

  requestWithdraw: async (): Promise<string> => {
    const { data } = await api.get("/users/withdraw");
    return data.data["confirmation-code"] as string;
  },

  withdraw: async (confirmationCode: string): Promise<void> => {
    await api.delete("/users/withdraw", {
      params: { "confirmation-code": confirmationCode },
    });
  },
};
