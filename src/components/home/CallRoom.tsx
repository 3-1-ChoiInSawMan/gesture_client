"use client";

import Image from "next/image";
import MockRoom from "@/assets/images/mockRoomImage.png";
import MockProfile from "@/assets/images/mockProfile.jpg";
import { UsersRound, Clock, Lock } from "lucide-react";

export interface CallRoomData {
  id: number;
  username: string;
  profileImage?: string | null;
  title: string;
  category: "일반" | "회의방" | "스터디";
  isPrivate: boolean;
  participants: number;
  maxParticipants: number;
  minutesAgo: number;
}

function formatTimeAgo(minutesAgo: number): string {
  if (minutesAgo < 1) return "방금 전";
  if (minutesAgo < 60) return `${minutesAgo}분 전`;
  const hours = Math.floor(minutesAgo / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
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
          alt="통화방 썸네일"
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          loading="eager"
          className="object-cover rounded-t-[15px]"
        />
      </div>

      <div className="px-2.5 pb-3 pt-2 flex flex-col gap-1">
        {/* 프로필 + 카테고리 + 자물쇠 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 relative">
              {room.profileImage ? (
                <Image
                  src={room.profileImage}
                  alt={room.username}
                  fill
                  sizes="24px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <Image
                  src={MockProfile}
                  alt={room.username}
                  width={24}
                  height={24}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <p className="text-[11px] font-semibold text-[#333333] truncate">
              {room.username}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-white text-[#724BFD] border border-[#724BFD]">
              {room.category}
            </span>
            {room.isPrivate && <Lock size={12} className="text-[#AAAAAA]" />}
          </div>
        </div>

        {/* 제목 */}
        <p className="text-[12px] font-medium text-[#333333] truncate">{room.title}</p>

        {/* 참여 인원 + 시간 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            <UsersRound size={11} color="#8C8C8C" />
            <p className="text-[9px] font-medium text-[#8C8C8C]">
              {room.participants}/{room.maxParticipants}
            </p>
          </div>
          <div className="flex items-center gap-0.5">
            <Clock size={11} color="#8C8C8C" />
            <p className="text-[9px] font-medium text-[#8C8C8C]">
              {formatTimeAgo(room.minutesAgo)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
