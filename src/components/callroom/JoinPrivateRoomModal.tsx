"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

const MOCK_CODE = "1234";

interface JoinPrivateRoomModalProps {
  roomTitle: string;
  onClose: () => void;
  onJoin: (code: string) => void;
}

export default function JoinPrivateRoomModal({
  roomTitle,
  onClose,
  onJoin,
}: JoinPrivateRoomModalProps) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    inputRefs.current[0]?.focus();
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleJoin = () => {
    const code = digits.join("");
    if (code.length < 4) {
      toast.error("4자리를 모두 입력해주세요.");
      return;
    }
    if (code !== MOCK_CODE) {
      toast.error("잘못된 코드입니다.");
      return;
    }
    onJoin(code);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") {
      handleJoin();
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        role="dialog"
        aria-modal="true"
      >
        <div className="w-[400px] bg-white rounded-[15px] border border-[#E6E9EE] shadow-[0px_8px_17px_0px_rgba(0,0,0,0.2)] px-[40px] py-[32px] flex flex-col gap-6">
          <h2 className="text-[20px] font-semibold text-black text-center tracking-tight">
            {roomTitle}
          </h2>
          <p className="text-[14px] text-[#555555] text-center">
            {roomTitle}에 참여하시겠습니까?
          </p>

          <div className="flex justify-center gap-3">
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-[56px] h-[56px] border border-[rgba(51,51,51,0.3)] rounded-[12px] text-center text-[20px] font-semibold text-[#333] outline-none focus:border-[#724BFD] transition-colors"
              />
            ))}
          </div>

          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 h-[42px] bg-[#F3F4F6] text-[#333] text-[14px] font-medium rounded-[10px] hover:bg-[#E9EAEC] transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleJoin}
              className="flex-1 h-[42px] bg-[#724BFD] text-white text-[14px] font-medium rounded-[10px] hover:bg-[#5f3de0] transition-colors"
            >
              참여
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
