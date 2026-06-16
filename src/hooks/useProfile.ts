"use client";

import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { userApi } from "@/api/userApi";
import { deleteCookie } from "@/lib/cookie";
import { useAuthStore, User } from "@/store/authStore";

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
        ...(fields.profileImageFile
          ? { profileImage: fields.profileImageFile }
          : {}),
      });
      setUser({
        ...user,
        nickname: updated.nickname ?? fields.nickname ?? user.nickname,
        statusMessage:
          updated.statusMessage ?? fields.statusMessage ?? user.statusMessage,
        profileImage:
          updated.profileUrl ?? updated.profileImage ?? user.profileImage,
      });
      toast.success("프로필이 수정되었습니다.");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "프로필 수정에 실패했습니다.";
      toast.error(message);
    }
  };

  const withdraw = async () => {
    await userApi.withdraw();
    localStorage.removeItem("accessToken");
    deleteCookie("refreshToken");
    clearUser();
    toast.success("회원탈퇴가 완료되었습니다.");
    router.replace("/auth/login");
  };

  return { user, getProfile, updateProfile, withdraw };
}
