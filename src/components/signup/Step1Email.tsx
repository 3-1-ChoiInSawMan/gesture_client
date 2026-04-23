"use client";

import * as C from "@/components";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
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

const EXPIRY_SECONDS = 300; // 5분
const MOCK_CODE = "123456";

export default function Step1Email({ formData, updateFormData, onNext }: Props) {
  const [errors, setErrors] = useState<Errors>({});
  const [isVerified, setIsVerified] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m} : ${s}`;
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(EXPIRY_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    updateFormData({ [name]: value });
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    if (name === "code") setIsVerified(false);
  };

  const handleSendCode = () => {
    if (!formData.email) {
      setErrors((prev) => ({ ...prev, email: "이메일을 입력해주세요." }));
      return;
    }
    if (!isValidEmail(formData.email)) {
      setErrors((prev) => ({ ...prev, email: "알맞은 이메일을 입력해주세요." }));
      return;
    }
    setErrors((prev) => ({ ...prev, email: undefined }));
    setIsVerified(false);
    startTimer();
    toast.success("인증 코드가 전송되었습니다.");
  };

  const handleVerifyCode = () => {
    if (!formData.code) {
      setErrors((prev) => ({ ...prev, code: "인증 코드를 입력해주세요." }));
      return;
    }
    if (formData.code !== MOCK_CODE) {
      toast.error("인증 코드가 올바르지 않습니다.");
      return;
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(0);
    setErrors((prev) => ({ ...prev, code: undefined }));
    setIsVerified(true);
    toast.success("인증이 완료되었습니다.");
  };

  const handleNext = () => {
    if (!isVerified) return;
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
        rightButton="send"
        rightButtonLabel="전송"
        onRightButtonClick={handleSendCode}
        errorMessage={errors.email}
      />
      <C.Input
        label="인증 코드"
        value={formData.code}
        placeholder="인증 코드를 입력하세요"
        onChange={handleChange}
        name="code"
        type="text"
        maxLength={6}
        rightButton="verify"
        timerLabel={timeLeft > 0 ? formatTime(timeLeft) : undefined}
        onRightButtonClick={handleVerifyCode}
        errorMessage={errors.code}
      />
      <div className="w-93.75 h-12.5 mt-4">
        <button
          type="button"
          onClick={handleNext}
          disabled={!isVerified}
          className="w-full h-full flex justify-center items-center bg-[#724BFD] rounded-[10px] text-[18px] font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
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
