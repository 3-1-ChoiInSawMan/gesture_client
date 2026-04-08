"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { toast } from "react-toastify";

interface LoginData {
  id: string;
  password: string;
  autoLogin: boolean;
}

export default function useAuth() {
  const [loading, setLoading] = useState(false);
  const { setUser, clearUser, signupData } = useAuthStore();
  const router = useRouter();

  const login = async ({ id, password }: LoginData) => {
    setLoading(true);

    const isValid = signupData
      ? (signupData.id === id || signupData.email === id) &&
        signupData.password === password
      : id === "admin" && password === "1234";

    if (isValid) {
      const userData = signupData
        ? {
            id: signupData.id,
            nickname: signupData.nickname,
            email: signupData.email,
            profileImage: undefined,
            statusMessage: signupData.statusMessage,
            joinedAt: new Date()
              .toLocaleDateString("ko-KR", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })
              .replace(/\.\s*/g, ".")
              .replace(/\.$/, ""),
            stats: { totalCalls: 0, friends: 0, rooms: 0 },
          }
        : {
            id: "admin",
            nickname: "임영웅",
            email: "imyoung.now@example.com",
            profileImage: undefined,
            statusMessage: "나는야 임영웅 할머니들 내가 다 꼬셔",
            joinedAt: "2026.03.10",
            stats: { totalCalls: 128, friends: 42, rooms: 8 },
          };

      setUser(userData);
      toast.success("로그인 성공");
      router.push("/auth/profile");
    } else {
      toast.error("아이디 또는 비밀번호가 틀렸습니다.");
    }

    setLoading(false);
  };

  const logout = () => {
    clearUser();
    toast.success("로그아웃 되었습니다.");
    router.push("/auth/login");
  };

  return { login, logout, loading };
}
