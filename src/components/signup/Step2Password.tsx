"use client";

import * as C from "@/components";
import Link from "next/link";
import { useState } from "react";
import { toast } from "react-toastify";
import { SignupFormData } from "@/app/auth/signup/page";

interface Props {
  formData: SignupFormData;
  updateFormData: (fields: Partial<SignupFormData>) => void;
  onNext: () => void;
  onPrev: () => void;
}

type Errors = {
  password?: string;
  passwordConfirm?: string;
};

export default function Step2Password({
  formData,
  updateFormData,
  onNext,
  onPrev,
}: Props) {
  const [errors, setErrors] = useState<Errors>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleNext = () => {
    const newErrors: Errors = {};
    if (!formData.password) newErrors.password = "비밀번호를 입력해주세요.";
    if (!formData.passwordConfirm)
      newErrors.passwordConfirm = "비밀번호 확인을 입력해주세요.";
    else if (formData.password !== formData.passwordConfirm)
      newErrors.passwordConfirm = "비밀번호가 일치하지 않습니다.";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    toast.success("비밀번호가 설정되었습니다.");
    onNext();
  };

  return (
    <form className="min-w-93.75 flex flex-col mt-14.25 gap-6">
      <C.Input
        label="비밀번호"
        value={formData.password}
        placeholder="비밀번호를 입력하세요"
        onChange={handleChange}
        name="password"
        type="password"
        passwordToggle
        errorMessage={errors.password}
      />
      <C.Input
        label="비밀번호 확인"
        value={formData.passwordConfirm}
        placeholder="비밀번호를 다시 입력하세요"
        onChange={handleChange}
        name="passwordConfirm"
        type="password"
        passwordToggle
        errorMessage={errors.passwordConfirm}
      />
      <div className="flex gap-3 mt-4">
        <button
          type="button"
          onClick={onPrev}
          className="flex-1 h-12.5 flex justify-center items-center bg-[#F3F4F6] rounded-[10px] text-[18px] font-semibold text-[#333333]"
        >
          이전
        </button>
        <button
          type="button"
          onClick={handleNext}
          className="flex-1 h-12.5 flex justify-center items-center bg-[#724BFD] rounded-[10px] text-[18px] font-semibold text-white"
        >
          다음
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
    </form>
  );
}
