"use client";

import * as C from "@/components";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { SignupFormData } from "@/app/auth/signup/page";
import { authApi } from "@/api/authApi";
import { mediaApi } from "@/api/mediaApi";
import ProfileImageUploader from "@/components/common/ProfileImageUploader";

interface Props {
  formData: SignupFormData;
  updateFormData: (fields: Partial<SignupFormData>) => void;
  onPrev: () => void;
}

type Errors = {
  id?: string;
  nickname?: string;
};

export default function Step3Profile({ formData, updateFormData, onPrev }: Props) {
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) updateFormData({ profileImage: file });
  };

  const handleSubmit = async () => {
    const newErrors: Errors = {};
    if (!formData.id) newErrors.id = "아이디를 입력해주세요.";
    if (!formData.nickname) newErrors.nickname = "닉네임을 입력해주세요.";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      let profile_image_uuid: string | null = null;
      if (formData.profileImage) {
        try {
          profile_image_uuid = await mediaApi.upload(formData.profileImage);
        } catch {
          // 이미지 업로드 실패해도 회원가입 진행
        }
      }

      await authApi.register({
        id: formData.id,
        email: formData.email,
        password: formData.password,
        nickname: formData.nickname,
        profile_image_uuid,
      });
      toast.success("회원가입이 완료되었습니다.");
      router.push("/auth/login");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "회원가입에 실패했습니다.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center mt-14.25 gap-6 pb-20">
      <h2 className="text-[28px] font-bold text-[#333333] text-center">
        프로필 설정
      </h2>

      <ProfileImageUploader
        previewUrl={
          formData.profileImage
            ? URL.createObjectURL(formData.profileImage)
            : null
        }
        onChange={handleImageChange}
      />

      <C.Input
        label="아이디"
        value={formData.id}
        placeholder="아이디를 입력하세요"
        onChange={handleChange}
        name="id"
        type="text"
        errorMessage={errors.id}
      />
      <C.Input
        label="닉네임"
        value={formData.nickname}
        placeholder="닉네임"
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
          value={formData.statusMessage}
          placeholder="상태 메시지를 입력해보세요!"
          onChange={(e) => updateFormData({ statusMessage: e.target.value })}
          name="statusMessage"
        />
      </div>

      <div className="flex gap-3 mt-4 w-93.75">
        <button
          type="button"
          onClick={onPrev}
          disabled={loading}
          className="flex-1 h-12.5 flex justify-center items-center bg-[#F3F4F6] rounded-[10px] text-[18px] font-semibold text-[#333333] disabled:opacity-40"
        >
          이전
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 h-12.5 flex justify-center items-center bg-[#724BFD] rounded-[10px] text-[18px] font-semibold text-white disabled:opacity-40"
        >
          {loading ? "처리 중..." : "가입 완료"}
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
