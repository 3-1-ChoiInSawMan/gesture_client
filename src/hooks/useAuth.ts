"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { toast } from "react-toastify";
import { authApi } from "@/api/authApi";

interface LoginData {
  id: string;
  password: string;
  autoLogin: boolean;
}

export default function useAuth() {
  const [loading, setLoading] = useState(false);
  const { setUser, clearUser } = useAuthStore();
  const router = useRouter();

  const login = async ({ id, password }: LoginData): Promise<string | null> => {
    setLoading(true);
    try {
      const result = await authApi.login({ email: id, password });
      setUser({
        id: result.user.id,
        nickname: result.user.nickname,
        email: result.user.email,
        profileImage: result.user.profileUrl ?? undefined,
        statusMessage: result.user.statusMessage ?? undefined,
        joinedAt: result.user.createdAt,
        stats: { totalCalls: 0, friends: 0, rooms: 0 },
      });
      toast.success("로그인에 성공했습니다.");
      router.push("/");
      return null;
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "이메일 또는 비밀번호를 확인해주세요.";
      toast.error(message);
      return message;
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
