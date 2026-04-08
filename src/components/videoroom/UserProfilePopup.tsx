"use client";

import { X, UserPlus } from "lucide-react";
import { Participant } from "./types";

interface UserProfilePopupProps {
  participant: Participant;
  onClose: () => void;
  onInvite: (participant: Participant) => void;
  style?: React.CSSProperties;
}

export default function UserProfilePopup({
  participant,
  onClose,
  onInvite,
  style,
}: UserProfilePopupProps) {
  return (
    <div
      className="absolute z-50 w-[220px] bg-white rounded-[12px] shadow-[0px_4px_20px_rgba(0,0,0,0.15)] border border-[#E6E9EE] p-4 flex flex-col gap-3"
      style={style}
    >
      {/* 닫기 버튼 */}
      <button
        onClick={onClose}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-[#AAAAAA] hover:text-[#333] transition-colors"
      >
        <X size={14} />
      </button>

      {/* 프로필 */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-[#724BFD]/20 flex items-center justify-center shrink-0">
          <span className="text-[18px] font-semibold text-[#724BFD]">
            {participant.name[0]}
          </span>
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-[14px] font-semibold text-[#333] truncate">
              {participant.name}
            </span>
            {participant.role && (
              <span className="text-[10px] text-[#724BFD] bg-[#724BFD]/10 px-1.5 py-0.5 rounded-full shrink-0">
                {participant.role}
              </span>
            )}
          </div>
          <span className="text-[11px] text-[#AAAAAA] truncate">
            @{participant.username}
          </span>
        </div>
      </div>

      {/* 초대 버튼 */}
      <button
        onClick={() => onInvite(participant)}
        className="flex items-center justify-center gap-1.5 w-full h-[34px] bg-[#724BFD] text-white text-[12px] font-medium rounded-[8px] hover:bg-[#5f3de0] transition-colors"
      >
        <UserPlus size={14} />
        초대하기
      </button>
    </div>
  );
}
