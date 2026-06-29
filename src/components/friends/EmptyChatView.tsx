"use client";

import Image from "next/image";
import { DefaultProfile } from "@/assets";
import { useAuthStore } from "@/store/authStore";

interface Props {
  onSendMessage: () => void;
}

export default function EmptyChatView({ onSendMessage }: Props) {
  const { user } = useAuthStore();

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#F0EEFF] gap-4">
      <div className="w-20 h-20 rounded-full overflow-hidden">
        <Image
          src={user?.profileImage ?? DefaultProfile}
          alt="프로필"
          width={80}
          height={80}
          className="w-full h-full object-cover"
        />
      </div>
      <p className="text-[18px] font-bold text-[#333333]">내 메시지</p>
      <p className="text-[14px] text-[#888888]">
        친구를 선택해 메시지를 보내보세요
      </p>
      <button
        onClick={onSendMessage}
        className="px-6 py-2.5 bg-[#724BFD] text-white text-[14px] font-semibold rounded-[10px] hover:bg-[#5f3de0] transition-colors"
      >
        메시지 보내기
      </button>
    </div>
  );
}
