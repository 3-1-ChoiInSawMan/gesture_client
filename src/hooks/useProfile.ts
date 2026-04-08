"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { User } from "@/store/authStore";
import { toast } from "react-toastify";

export default function useProfile() {
  const { user, setUser, clearUser } = useAuthStore();
  const router = useRouter();

  const getProfile = () => {
    return user ?? null;
  };

  const updateProfile = (fields: Partial<User>) => {
    if (!user) return;
    setUser({ ...user, ...fields });
  };

  const deleteAccount = () => {
    clearUser();
    router.push("/auth/signup");
    toast.success("회원 탈퇴 되었습니다.");
  };

  return { user, getProfile, updateProfile, deleteAccount };
}
