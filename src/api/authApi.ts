import { api } from "./axiosInstance";
import { setCookie } from "@/lib/cookie";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterRequest {
  id: string;
  email: string;
  password: string;
  nickname: string;
  profile_image_uuid?: string | null;
}

export const authApi = {
  login: async (body: LoginRequest): Promise<TokenResponse> => {
    const { data } = await api.post("/auth/login", body);
    const tokens: TokenResponse = data.data;
    if (typeof window !== "undefined") {
      localStorage.setItem("accessToken", tokens.accessToken);
    }
    setCookie("refreshToken", tokens.refreshToken);
    return tokens;
  },

  emailSend: async (email: string): Promise<string> => {
    const { data } = await api.post("/auth/email-send", { email });
    return data.message as string;
  },

  emailVerification: async (code: string): Promise<string> => {
    const { data } = await api.post("/auth/email-verification", { code });
    return data.message as string;
  },

  register: async (body: RegisterRequest): Promise<void> => {
    await api.post("/auth/register", body);
  },

  logout: async (): Promise<void> => {
    await api.post("/auth/logout");
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
