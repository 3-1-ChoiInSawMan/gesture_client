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
  code?: string;
};

export default function Step1Email({
  formData,
  updateFormData,
  onNext,
}: Props) {
  const [errors, setErrors] = useState<Errors>({});
  const [isVerified, setIsVerified] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    if (name === "code") setIsVerified(false);
  };

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSendCode = () => {
    if (!formData.email) {
      setErrors((prev) => ({ ...prev, email: "이메일을 입력해주세요." }));
      return;
    }
    if (!isValidEmail(formData.email)) {
      setErrors((prev) => ({
        ...prev,
        email: "알맞은 이메일을 입력해주세요.",
      }));
      return;
    }
    setErrors((prev) => ({ ...prev, email: undefined }));
    console.log("인증코드 전송:", formData.email);
  };

  const handleVerifyCode = () => {
    if (!formData.code) {
      setErrors((prev) => ({ ...prev, code: "인증 코드를 입력해주세요." }));
      return;
    }
    setErrors((prev) => ({ ...prev, code: undefined }));
    setIsVerified(true);
    console.log("인증코드 확인:", formData.code);
  };

  const handleNext = () => {
    const newErrors: Errors = {};
    if (!formData.email) newErrors.email = "이메일을 입력해주세요.";
    else if (!isValidEmail(formData.email))
      newErrors.email = "알맞은 이메일을 입력해주세요.";
    if (!formData.code) newErrors.code = "인증 코드를 입력해주세요.";
    else if (!isVerified) newErrors.code = "인증 코드를 확인해주세요.";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
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
        onchange={handleChange}
        name="email"
        type="email"
        rightButton="send"
        onRightButtonClick={handleSendCode}
        errorMessage={errors.email}
      />
      <C.Input
        label="인증 코드"
        value={formData.code}
        placeholder="인증 코드를 입력하세요"
        onchange={handleChange}
        name="code"
        type="text"
        rightButton="verify"
        onRightButtonClick={handleVerifyCode}
        errorMessage={errors.code}
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
