"use client";

import Image from "next/image";
import MockRoom from "@/assets/images/mockRoomImage.png";
import MockProfile from "@/assets/images/mockProfile.jpg";
import { UsersRound, Clock, Lock } from "lucide-react";

export interface CallRoomData {
  id: number;
  username: string;
  title: string;
  category: "일반" | "회의방" | "스터디";
  isPrivate: boolean;
  participants: number;
  minutesAgo: number;
}

interface Props {
  room: CallRoomData;
  onClick?: (room: CallRoomData) => void;
}

export default function CallRoom({ room, onClick }: Props) {
  return (
    <div
      className="w-full rounded-[15px] border border-[#D9D9D9] overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick?.(room)}
    >
      {/* 썸네일 */}
      <div className="w-full aspect-video relative">
        <Image
          src={MockRoom}
          alt="목데이터"
          fill
          className="object-cover rounded-t-[15px]"
        />
      </div>

      <div className="px-2.5 pb-3 pt-2 flex flex-col gap-1">
        {/* 프로필 + 카테고리 + 자물쇠 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-6 h-6 rounded-full overflow-hidden shrink-0">
              <Image
                src={MockProfile}
                alt="프로필"
                width={24}
                height={24}
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-[11px] font-semibold text-[#333333] truncate">
              {room.username}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-white text-[#724BFD] border border-[#724BFD]"
            >
              {room.category}
            </span>
            {room.isPrivate && <Lock size={12} className="text-[#AAAAAA]" />}
          </div>
        </div>

        {/* 제목 + 참가자/시간 */}
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[#8C8C8C] truncate flex-1">
            {room.title}
          </p>
          <div className="flex gap-2 shrink-0 ml-2">
            <div className="flex items-center gap-0.5">
              <UsersRound size={11} color="#8C8C8C" />
              <p className="text-[9px] font-medium text-[#8C8C8C]">
                {room.participants}
              </p>
            </div>
            <div className="flex items-center gap-0.5">
              <Clock size={11} color="#8C8C8C" />
              <p className="text-[9px] font-medium text-[#8C8C8C]">
                {room.minutesAgo}분 전
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
