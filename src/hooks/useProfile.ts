"use client";

import { useRouter } from "next/navigation";
import { useAuthStore, User } from "@/store/authStore";
import { userApi } from "@/api/userApi";
import { toast } from "react-toastify";

export interface UpdateProfileFields extends Partial<User> {
  profileImageFile?: File;
}

export default function useProfile() {
  const { user, setUser, clearUser } = useAuthStore();
  const router = useRouter();

  const getProfile = () => user ?? null;

  const updateProfile = async (fields: UpdateProfileFields) => {
    if (!user) return;
    try {
      const updated = await userApi.updateUser({
        nickname: fields.nickname,
        statusMessage: fields.statusMessage,
        profileImage: fields.profileImageFile,
      });
      setUser({
        ...user,
        nickname: updated.nickname,
        statusMessage: updated.statusMessage,
        profileImage: updated.profileImage,
      });
      toast.success("프로필이 업데이트되었습니다.");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "프로필 업데이트에 실패했습니다.";
      toast.error(message);
    }
  };

  const deleteAccount = async () => {
    try {
      const confirmCode = await userApi.requestWithdraw();
      await userApi.withdraw(confirmCode);
      clearUser();
      router.push("/auth/signup");
      toast.success("회원 탈퇴 되었습니다.");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "회원 탈퇴에 실패했습니다.";
      toast.error(message);
    }
  };

  return { user, getProfile, updateProfile, deleteAccount };
}
