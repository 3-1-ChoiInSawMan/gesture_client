"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthStore } from "@/store/authStore";
import { DefaultProfile } from "@/assets";
import * as C from "@/components";

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

    router.push("/auth/profile");
  };

  return (
    <div className="w-full min-h-screen bg-white flex justify-center">
      <div className="w-[640px] flex flex-col items-center py-14 gap-6">
        <div className="flex justify-center">
          <label htmlFor="profileImage" className="cursor-pointer relative">
            <div className="w-36 h-36 rounded-full overflow-hidden">
              <Image
                src={previewUrl ?? DefaultProfile}
                alt="프로필"
                width={144}
                height={144}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute bottom-0 right-0 w-9 h-9 bg-[#724BFD] rounded-full flex items-center justify-center">
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          </label>
          <input
            id="profileImage"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
        </div>

        <C.Input
          label="아이디"
          value={id}
          placeholder="아이디를 입력하세요"
          onchange={handleChange}
          name="id"
          type="text"
          errorMessage={errors.id}
        />

        <C.Input
          label="닉네임"
          value={nickname}
          placeholder="닉네임을 입력하세요"
          onchange={handleChange}
          name="nickname"
          type="text"
          errorMessage={errors.nickname}
        />

        <div className="flex flex-col w-93.75" style={{ gap: "11px" }}>
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
