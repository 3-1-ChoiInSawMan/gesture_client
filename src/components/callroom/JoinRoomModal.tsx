"use client";

import { useEffect } from "react";

interface JoinRoomModalProps {
  roomTitle: string;
  isPrivate: boolean;
  onClose: () => void;
  onJoin: () => void;
}

export default function JoinRoomModal({
  roomTitle,
  isPrivate,
  onClose,
  onJoin,
}: JoinRoomModalProps) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (isPrivate) return null;

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
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 h-[42px] bg-[#F3F4F6] text-[#333] text-[14px] font-medium rounded-[10px] hover:bg-[#E9EAEC] transition-colors"
            >
              취소
            </button>
            <button
              onClick={onJoin}
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
