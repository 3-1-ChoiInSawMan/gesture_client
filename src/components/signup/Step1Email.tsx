"use client";

import * as C from "@/components";
import Link from "next/link";
import { useState } from "react";
import { SignupFormData } from "@/app/auth/signup/page";

interface Props {
  formData: SignupFormData;
  updateFormData: (fields: Partial<SignupFormData>) => void;
  onNext: () => void;
}

type Errors = {
  email?: string;
};

export default function Step1Email({ formData, updateFormData, onNext }: Props) {
  const [errors, setErrors] = useState<Errors>({});

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleNext = () => {
    if (!formData.email) {
      setErrors({ email: "이메일을 입력해주세요." });
      return;
    }
    if (!isValidEmail(formData.email)) {
      setErrors({ email: "올바른 이메일 형식을 입력해주세요." });
      return;
    }
    onNext();
  };

  return (
    <form className="min-w-93.75 flex flex-col mt-14.25 gap-6">
      <C.Input
        label="이메일"
        value={formData.email}
        placeholder="이메일"
        onChange={handleChange}
        name="email"
        type="email"
        errorMessage={errors.email}
      />
      <div className="w-93.75 h-12.5 mt-4">
        <button
          type="button"
          onClick={handleNext}
          className="w-full h-full flex justify-center items-center bg-[#724BFD] rounded-[10px] text-[18px] font-semibold text-white"
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
