import { api } from "./axiosInstance";
import { setCookie } from "@/lib/cookie";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginUser {
  idx: number;
  id: string;
  email: string;
  nickname: string;
  profileUrl: string | null;
  statusMessage: string | null;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: LoginUser;
}

export interface RegisterRequest {
  id: string;
  email: string;
  password: string;
  passwordConfirm: string;
  nickname: string;
}

export const authApi = {
  login: async (body: LoginRequest): Promise<LoginResponse> => {
    const { data } = await api.post("/auth/login", body);
    const user = data.data.user as LoginUser & { accessToken: string; refreshToken: string };
    if (typeof window !== "undefined") {
      localStorage.setItem("accessToken", user.accessToken);
    }
    setCookie("refreshToken", user.refreshToken);
    return {
      accessToken: user.accessToken,
      refreshToken: user.refreshToken,
      user: {
        idx: user.idx,
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        profileUrl: user.profileUrl,
        statusMessage: user.statusMessage,
        createdAt: user.createdAt,
      },
    };
  },

  emailSend: async (email: string): Promise<string> => {
    const { data } = await api.post("/auth/email-send", { email });
    return data.message as string;
  },

  emailVerification: async (email: string, code: string): Promise<string> => {
    const { data } = await api.post("/auth/email-verification", { email, code });
    return data.message as string;
  },

  register: async (body: RegisterRequest): Promise<void> => {
    await api.post("/auth/register", body);
  },

  logout: async (): Promise<void> => {
    // TODO: 백엔드 구현 후 활성화
    // await api.post("/auth/logout");
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
    }
    const { deleteCookie } = await import("@/lib/cookie");
    deleteCookie("refreshToken");
  },

  recover: async (email: string): Promise<string> => {
    const { data } = await api.post("/auth/recover", { email });
    return data.message as string;
  },
};
