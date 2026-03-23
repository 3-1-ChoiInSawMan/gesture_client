"use client";

import * as C from "@/components";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignupFormData } from "@/app/auth/signup/page";
import { useAuthStore } from "@/store/authStore";
import { DefaultProfile } from "@/assets";

interface Props {
  formData: SignupFormData;
  updateFormData: (fields: Partial<SignupFormData>) => void;
}

type Errors = {
  id?: string;
  nickname?: string;
};

export default function Step3Profile({ formData, updateFormData }: Props) {
  const [errors, setErrors] = useState<Errors>({});
  const { setSignupData, signupData: existingSignups } = useAuthStore();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      updateFormData({ profileImage: e.target.files[0] });
    }
  };

  const handleSubmit = () => {
    const newErrors: Errors = {};
    if (!formData.id) {
      newErrors.id = "아이디를 입력해주세요.";
    } else if (existingSignups?.id === formData.id) {
      newErrors.id = "이미 사용 중인 아이디입니다.";
    }
    if (!formData.nickname) {
      newErrors.nickname = "닉네임을 입력해주세요.";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSignupData({
      email: formData.email,
      password: formData.password,
      id: formData.id,
      nickname: formData.nickname,
      statusMessage: formData.statusMessage,
    });

    router.push("/auth/login");
  };

  return (
    <div className="w-full flex flex-col items-center mt-14.25 gap-6">
      <h2 className="text-[28px] font-bold text-[#333333] text-center">
        프로필 설정
      </h2>

      <div className="flex justify-center">
        <label htmlFor="profileImage" className="cursor-pointer relative">
          <div className="w-36 h-36 rounded-full overflow-hidden">
            {formData.profileImage ? (
              <Image
                src={URL.createObjectURL(formData.profileImage)}
                alt="프로필"
                width={144}
                height={144}
                className="w-full h-full object-cover"
              />
            ) : (
              <Image
                src={DefaultProfile}
                alt="기본 프로필"
                width={144}
                height={144}
                className="w-full h-full object-cover"
              />
            )}
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
        value={formData.id}
        placeholder="아이디를 입력하세요"
        onchange={handleChange}
        name="id"
        type="text"
        errorMessage={errors.id}
      />
      <C.Input
        label="닉네임"
        value={formData.nickname}
        placeholder="닉네임"
        onchange={handleChange}
        name="nickname"
        type="text"
        errorMessage={errors.nickname}
      />

      <div className="flex flex-col w-93.75" style={{ gap: "11px" }}>
        <p className="text-[16px] font-semibold text-[#333333]">
          상태 메시지{" "}
          <span className="text-[#AAAAAA] text-[13px] font-normal">(선택)</span>
        </p>
        <textarea
          className="w-93.75 h-28 px-5 py-3.5 border border-[#333333] rounded-[10px] bg-transparent outline-none resize-none text-[15px]"
          value={formData.statusMessage}
          placeholder="상태 메시지를 입력해보세요!"
          onChange={(e) => updateFormData({ statusMessage: e.target.value })}
          name="statusMessage"
        />
      </div>

      <div className="w-93.75 h-12.5 mt-4">
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full h-full flex justify-center items-center bg-[#724BFD] rounded-[10px] text-[18px] font-semibold text-white"
        >
          가입 완료
        </button>
      </div>
      <div className="flex justify-center w-full">
        <p className="text-[#6D6D6D] text-[16px]">
          이미 계정이 있으십니까?
          <span className="ml-3.5 text-[#724BFD] text-[16px] cursor-pointer">
            <Link href="/auth/login">로그인</Link>
          </span>
        </p>
      </div>
    </div>
  );
}
