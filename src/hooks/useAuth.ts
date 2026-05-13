"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { toast } from "react-toastify";
import { authApi } from "@/api/authApi";
import { userApi } from "@/api/userApi";

interface LoginData {
  id: string;
  password: string;
  autoLogin: boolean;
}

export default function useAuth() {
  const [loading, setLoading] = useState(false);
  const { setUser, clearUser } = useAuthStore();
  const router = useRouter();

  const login = async ({ id, password }: LoginData) => {
    setLoading(true);
    try {
      await authApi.login({ email: id, password });
      const profile = await userApi.getMe();
      setUser({
        id: profile.userId ?? profile.id,
        nickname: profile.nickname,
        email: profile.email,
        profileImage: profile.profileImage,
        statusMessage: profile.statusMessage,
        joinedAt: profile.joinedAt,
        stats: profile.stats ?? { totalCalls: 0, friends: 0, rooms: 0 },
      });
      toast.success("로그인 성공");
      router.push("/auth/profile");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "로그인에 실패했습니다.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // 실패해도 로컬 데이터 정리
    }
    clearUser();
    toast.success("로그아웃 되었습니다.");
    router.push("/auth/login");
  };

  return { login, logout, loading };
}
