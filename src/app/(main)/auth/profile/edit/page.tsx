"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useAuthStore } from "@/store/authStore";
import * as C from "@/components";
import ProfileImageUploader from "@/components/common/ProfileImageUploader";

type Errors = {
  id?: string;
  nickname?: string;
};

export default function ProfileEditPage() {
  const { user, setUser } = useAuthStore();
  const router = useRouter();

  const [id, setId] = useState(user?.id ?? "");
  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [statusMessage, setStatusMessage] = useState(user?.statusMessage ?? "");
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    user?.profileImage ?? null,
  );
  const [errors, setErrors] = useState<Errors>({});

  if (!user) {
    router.push("/auth/login");
    return null;
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPreviewUrl(URL.createObjectURL(file));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "id") {
      setId(value);
      setErrors((prev) => ({ ...prev, id: undefined }));
    }
    if (name === "nickname") {
      setNickname(value);
      setErrors((prev) => ({ ...prev, nickname: undefined }));
    }
  };

  const handleSubmit = () => {
    const newErrors: Errors = {};
    if (!id) newErrors.id = "아이디를 입력해주세요.";
    if (!nickname) newErrors.nickname = "닉네임을 입력해주세요.";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setUser({
      ...user,
      id,
      nickname,
      statusMessage,
      profileImage: previewUrl ?? user.profileImage,
    });

    toast.success("프로필이 수정되었습니다.");
    router.push("/auth/profile");
  };

  return (
    <div className="w-full min-h-screen bg-white flex justify-center">
      <div className="w-[640px] flex flex-col items-center py-14 gap-6">
        <ProfileImageUploader previewUrl={previewUrl} onChange={handleImageChange} />

        <C.Input
          label="아이디"
          value={id}
          placeholder="아이디를 입력하세요"
          onChange={handleChange}
          name="id"
          type="text"
          errorMessage={errors.id}
        />

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
            <span className="text-[#AAAAAA] text-[13px] font-normal">
              (선택)
            </span>
          </p>
          <textarea
            className="w-93.75 h-28 px-5 py-3.5 border border-[#333333] rounded-[10px] bg-transparent outline-none resize-none text-[15px]"
            value={statusMessage}
            placeholder="상태 메시지를 입력해보세요!"
            onChange={(e) => setStatusMessage(e.target.value)}
            name="statusMessage"
          />
        </div>

        <div className="w-93.75 h-12.5 mt-4">
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full h-full flex justify-center items-center bg-[#724BFD] rounded-[10px] text-[18px] font-semibold text-white"
          >
            완료
          </button>
        </div>
      </div>
    </div>
  );
}
