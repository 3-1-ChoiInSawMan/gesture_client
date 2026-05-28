"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { toast } from "react-toastify";

interface Props {
  onClose: () => void;
  onRequestWithdraw: (password: string) => Promise<void>;
  onConfirmWithdraw: (confirmationCode: string) => Promise<void>;
}

export default function DeleteAccountModal({ onClose, onRequestWithdraw, onConfirmWithdraw }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [password, setPassword] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestWithdraw = async () => {
    if (!password) return;
    setLoading(true);
    try {
      await onRequestWithdraw(password);
      toast.success("이메일을 확인해주세요.");
      setStep(2);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "요청에 실패했습니다.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmWithdraw = async () => {
    if (!confirmCode) return;
    setLoading(true);
    try {
      await onConfirmWithdraw(confirmCode);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "회원 탈퇴에 실패했습니다.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-grayscale" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="bg-white rounded-2xl px-8 py-8 flex flex-col items-center gap-4 w-[360px] shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle size={24} className="text-red-400" />
          </div>

          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-[16px] font-bold text-[#333333]">제스처를 떠나시겠습니까?</p>
            <p className="text-[13px] text-[#AAAAAA]">탈퇴한 계정은 복구 불가합니다.</p>
          </div>

          {step === 1 ? (
            <div className="flex flex-col gap-1.5 w-full">
              <p className="text-[13px] text-[#555555]">비밀번호를 입력하여 확인하세요.</p>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호"
                className="w-full border border-[#EEEEEE] rounded-xl px-4 py-3 text-[14px] text-[#333333] placeholder:text-[#CCCCCC] outline-none focus:border-[#724BFD] transition-colors"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 w-full">
              <p className="text-[13px] text-[#555555]">이메일로 받은 인증 코드를 입력하세요.</p>
              <input
                type="text"
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                placeholder="인증 코드"
                className="w-full border border-[#EEEEEE] rounded-xl px-4 py-3 text-[14px] text-[#333333] placeholder:text-[#CCCCCC] outline-none focus:border-[#724BFD] transition-colors"
              />
            </div>
          )}

          <div className="flex flex-col gap-2 w-full">
            <button
              className="w-full py-3 rounded-xl text-white text-[14px] font-semibold bg-red-400 hover:bg-red-500 disabled:bg-red-200 disabled:cursor-not-allowed transition-colors"
              onClick={step === 1 ? handleRequestWithdraw : handleConfirmWithdraw}
              disabled={loading || (step === 1 ? !password : !confirmCode)}
            >
              {loading ? "처리 중..." : step === 1 ? "인증 이메일 발송" : "회원 탈퇴 확인"}
            </button>
            <button
              className="w-full py-3 rounded-xl border border-[#EEEEEE] text-[14px] text-[#333333] hover:bg-[#F5F5F5] transition-colors"
              onClick={onClose}
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
