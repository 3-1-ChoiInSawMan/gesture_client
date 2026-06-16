"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { toast } from "react-toastify";

interface Props {
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteAccountModal({ onClose, onConfirm }: Props) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "회원탈퇴에 실패했습니다.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div
          className="flex w-full max-w-[380px] flex-col items-center gap-5 rounded-[8px] bg-white px-8 py-8 shadow-xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <AlertCircle size={25} className="text-red-500" />
          </div>
          <div className="text-center">
            <h2 className="text-[18px] font-bold text-[#333333]">회원탈퇴를 진행할까요?</h2>
            <p className="mt-2 text-[14px] leading-6 text-[#777777]">
              탈퇴한 계정은 복구할 수 없으며 저장된 계정 정보가 비활성화됩니다.
            </p>
          </div>
          <div className="flex w-full gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="h-11 flex-1 rounded-[6px] border border-[#DDDDDD] text-[14px] font-semibold text-[#555555] hover:bg-[#F5F5F5] disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="h-11 flex-1 rounded-[6px] bg-red-500 text-[14px] font-semibold text-white hover:bg-red-600 disabled:bg-red-300"
            >
              {loading ? "처리 중..." : "회원탈퇴"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
