"use client";

import * as C from "@/components";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { SignupFormData } from "@/app/auth/signup/page";
import { authApi } from "@/api/authApi";

interface Props {
  formData: SignupFormData;
  updateFormData: (fields: Partial<SignupFormData>) => void;
  onNext: () => void;
}

type Phase = "input" | "sent" | "verified";

export default function Step1Email({ formData, updateFormData, onNext }: Props) {
  const [phase, setPhase] = useState<Phase>("input");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | undefined>();
  const [emailError, setEmailError] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const startCountdown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCountdown(300);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setPhase("input");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSendCode = async () => {
    if (!formData.email) {
      setEmailError("이메일을 입력해주세요.");
      return;
    }
    if (!isValidEmail(formData.email)) {
      setEmailError("올바른 이메일 형식을 입력해주세요.");
      return;
    }
    setEmailError(undefined);
    setSending(true);
    try {
      await authApi.emailSend(formData.email);
      toast.success("인증코드가 발송되었습니다.");
      setPhase("sent");
      startCountdown();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "인증코드 발송에 실패했습니다.";
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || sending) return;
    setSending(true);
    try {
      await authApi.emailSend(formData.email);
      toast.success("인증코드가 재발송되었습니다.");
      setCode("");
      setCodeError(undefined);
      startCountdown();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "인증코드 발송에 실패했습니다.";
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (!code.trim()) {
      setCodeError("인증코드를 입력해주세요.");
      return;
    }
    setVerifying(true);
    try {
      await authApi.emailVerification(formData.email, code.trim());
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase("verified");
      setCodeError(undefined);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "인증에 실패했습니다.";
      setCodeError(message);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <form className="min-w-93.75 flex flex-col mt-14.25 gap-6" onSubmit={(e) => e.preventDefault()}>
      {/* 이메일 입력 */}
      <C.Input
        label="이메일"
        value={formData.email}
        placeholder="이메일"
        onChange={(e) => {
          updateFormData({ email: e.target.value });
          setEmailError(undefined);
        }}
        name="email"
        type="email"
        errorMessage={emailError}
        disabled={phase !== "input"}
        rightButton="send"
        rightButtonLabel={
          phase === "input"
            ? sending
              ? "발송 중..."
              : "코드 받기"
            : countdown > 0
            ? `(${String(Math.floor(countdown / 60)).padStart(2, "0")}:${String(countdown % 60).padStart(2, "0")})`
            : sending
            ? "발송 중..."
            : "재발송"
        }
        rightButtonDisabled={
          sending || phase === "verified" || (phase === "sent" && countdown > 0)
        }
        onRightButtonClick={phase === "input" ? handleSendCode : handleResend}
      />

      {/* 인증코드 입력 */}
      {(phase === "sent" || phase === "verified") && (
        <C.Input
          label="인증코드"
          value={code}
          placeholder="인증코드를 입력하세요"
          onChange={(e) => {
            setCode(e.target.value);
            setCodeError(undefined);
          }}
          name="code"
          type="text"
          errorMessage={codeError}
          disabled={phase === "verified"}
          timerLabel={phase === "verified" ? "✓ 인증 완료" : undefined}
          rightButton={phase === "sent" ? "verify" : false}
          rightButtonDisabled={verifying}
          onRightButtonClick={handleVerify}
        />
      )}

      {/* 다음 버튼 */}
      <div className="w-93.75 h-12.5 mt-4">
        <button
          type="button"
          onClick={onNext}
          disabled={phase !== "verified"}
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
