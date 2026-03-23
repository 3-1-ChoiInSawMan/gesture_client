"use client";

import Link from "next/link";
import { Settings, LogOut, UserX, ChevronRight } from "lucide-react";

interface Props {
  onLogout: () => void;
}

export default function AccountSettings({ onLogout }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Settings size={17} className="text-[#724BFD]" />
        <p className="text-[16px] font-bold text-[#333333]">계정 설정</p>
      </div>
      <div className="flex flex-col border border-[#EEEEEE] rounded-[14px] overflow-hidden">
        <Link href="/auth/password">
          <div className="flex items-center justify-between px-5 py-3.5 hover:bg-[#F5F5F5] cursor-pointer border-b border-[#EEEEEE]">
            <div className="flex items-center gap-3 text-[#333333]">
              <UserX size={15} />
              <p className="text-[14px]">비밀번호 변경</p>
            </div>
            <ChevronRight size={15} className="text-[#AAAAAA]" />
          </div>
        </Link>
        <div
          onClick={onLogout}
          className="flex items-center justify-between px-5 py-3.5 hover:bg-[#F5F5F5] cursor-pointer border-b border-[#EEEEEE]"
        >
          <div className="flex items-center gap-3 text-[#333333]">
            <LogOut size={15} />
            <p className="text-[14px]">로그아웃</p>
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-3.5 hover:bg-[#FFF5F5] cursor-pointer">
          <div className="flex items-center gap-3 text-red-500">
            <UserX size={15} />
            <p className="text-[14px]">회원 탈퇴</p>
          </div>
          <ChevronRight size={15} className="text-red-400" />
        </div>
      </div>
    </div>
  );
}
