"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { AlertCircle } from "lucide-react";

interface Props {
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteAccountModal({ onClose, onConfirm }: Props) {
  const { user } = useAuthStore();
  const [email, setEmail] = useState("");
  const isMatch = email === user?.email;

  return (
    <>
      {/* 흑백 오버레이 */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-grayscale"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="bg-white rounded-2xl px-8 py-8 flex flex-col items-center gap-4 w-[360px] shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 경고 아이콘 */}
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle size={24} className="text-red-400" />
          </div>

          {/* 텍스트 */}
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-[16px] font-bold text-[#333333]">
              제스처를 떠나시겠습니까?
            </p>
            <p className="text-[13px] text-[#AAAAAA]">
              탈퇴한 계정은 복구 불가합니다.
            </p>
          </div>

          {/* 이메일 입력 */}
          <div className="flex flex-col gap-1.5 w-full">
            <p className="text-[13px] text-[#555555]">
              이메일을 입력하여 확인하세요.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={user?.email ?? "test@gmail.com"}
              className="w-full border border-[#EEEEEE] rounded-xl px-4 py-3 text-[14px] text-[#333333] placeholder:text-[#CCCCCC] outline-none focus:border-[#724BFD] transition-colors"
            />
          </div>

          {/* 버튼 */}
          <div className="flex flex-col gap-2 w-full">
            <button
              className={`w-full py-3 rounded-xl text-white text-[14px] font-semibold transition-colors ${
                isMatch
                  ? "bg-red-400 hover:bg-red-500 cursor-pointer"
                  : "bg-red-200 cursor-not-allowed"
              }`}
              onClick={isMatch ? onConfirm : undefined}
              disabled={!isMatch}
            >
              회원 탈퇴
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
