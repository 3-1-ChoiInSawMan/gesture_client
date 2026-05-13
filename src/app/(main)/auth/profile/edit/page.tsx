"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { userApi } from "@/api/userApi";
import { toast } from "react-toastify";
import * as C from "@/components";
import ProfileImageUploader from "@/components/common/ProfileImageUploader";

type Errors = {
  nickname?: string;
};

export default function ProfileEditPage() {
  const { user, setUser } = useAuthStore();
  const router = useRouter();

  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [statusMessage, setStatusMessage] = useState(user?.statusMessage ?? "");
  const [previewUrl, setPreviewUrl] = useState<string | null>(user?.profileImage ?? null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  if (!user) {
    router.push("/auth/login");
    return null;
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "nickname") {
      setNickname(value);
      setErrors((prev) => ({ ...prev, nickname: undefined }));
    }
  };

  const handleSubmit = async () => {
    if (!nickname) {
      setErrors({ nickname: "닉네임을 입력해주세요." });
      return;
    }

    setLoading(true);
    try {
      const updated = await userApi.updateUser({
        nickname,
        statusMessage,
        profileImage: profileImageFile ?? undefined,
      });
      setUser({
        ...user,
        nickname: updated.nickname,
        statusMessage: updated.statusMessage,
        profileImage: updated.profileImage,
      });
      toast.success("프로필이 수정되었습니다.");
      router.push("/auth/profile");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "프로필 수정에 실패했습니다.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-white flex justify-center">
      <div className="w-[640px] flex flex-col items-center py-14 gap-6">
        <ProfileImageUploader previewUrl={previewUrl} onChange={handleImageChange} />

        <C.Input
          label="닉네임"
          value={nickname}
          placeholder="닉네임을 입력하세요"
          onChange={handleChange}
          name="nickname"
          type="text"
          errorMessage={errors.nickname}
        />

        <div className="flex flex-col w-93.75 gap-[11px]">
          <p className="text-[16px] font-semibold text-[#333333]">
            상태 메시지{" "}
            <span className="text-[#AAAAAA] text-[13px] font-normal">(선택)</span>
          </p>
          <textarea
            className="w-93.75 h-28 px-5 py-3.5 border border-[#333333] rounded-[10px] bg-transparent outline-none resize-none text-[15px]"
            value={statusMessage}
            placeholder="상태 메시지를 입력해보세요!"
            onChange={(e) => setStatusMessage(e.target.value)}
          />
        </div>

        <div className="w-93.75 h-12.5 mt-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-full flex justify-center items-center bg-[#724BFD] rounded-[10px] text-[18px] font-semibold text-white disabled:opacity-40"
          >
            {loading ? "저장 중..." : "완료"}
          </button>
        </div>
      </div>
    </div>
  );
}
