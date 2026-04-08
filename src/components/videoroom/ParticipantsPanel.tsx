"use client";

import { useState } from "react";
import { X, UserPlus, MicOff, VideoOff } from "lucide-react";
import { Participant } from "./types";
import UserProfilePopup from "./UserProfilePopup";

interface ParticipantsPanelProps {
  participants: Participant[];
  onClose: () => void;
  onInvite: () => void;
}

export default function ParticipantsPanel({
  participants,
  onClose,
  onInvite,
}: ParticipantsPanelProps) {
  const [selectedParticipant, setSelectedParticipant] =
    useState<Participant | null>(null);
  const [popupParticipantId, setPopupParticipantId] = useState<string | null>(
    null
  );

  const handleParticipantClick = (p: Participant) => {
    if (popupParticipantId === p.id) {
      setPopupParticipantId(null);
      setSelectedParticipant(null);
    } else {
      setPopupParticipantId(p.id);
      setSelectedParticipant(p);
    }
  };

  const closePopup = () => {
    setPopupParticipantId(null);
    setSelectedParticipant(null);
  };

  return (
    <div className="w-[280px] shrink-0 flex flex-col bg-white border-l border-[#E6E9EE] h-full relative">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E6E9EE]">
        <span className="text-[14px] font-semibold text-[#333]">참여자 목록</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onInvite}
            title="초대하기"
            className="w-7 h-7 flex items-center justify-center text-[#724BFD] hover:bg-[#F5F5F5] rounded-[6px] transition-colors"
          >
            <UserPlus size={16} />
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-[#AAAAAA] hover:text-[#333] transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* 참여자 목록 */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {participants.map((p) => (
          <div key={p.id} className="relative">
            <button
              onClick={() => handleParticipantClick(p)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] hover:bg-[#F5F5F5] transition-colors text-left"
            >
              {/* 아바타 */}
              <div className="w-9 h-9 rounded-full bg-[#724BFD]/20 flex items-center justify-center shrink-0">
                <span className="text-[13px] font-semibold text-[#724BFD]">
                  {p.name[0]}
                </span>
              </div>

              {/* 이름/아이디 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-medium text-[#333] truncate">
                    {p.name}
                  </span>
                  {p.role && (
                    <span className="text-[9px] text-[#724BFD] bg-[#724BFD]/10 px-1.5 py-0.5 rounded-full shrink-0">
                      {p.role}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[#AAAAAA] truncate block">
                  @{p.username}
                </span>
              </div>

              {/* 상태 아이콘 */}
              <div className="flex items-center gap-1 shrink-0">
                {p.isMuted && <MicOff size={13} className="text-[#FF4444]" />}
                {p.isCameraOff && (
                  <VideoOff size={13} className="text-[#AAAAAA]" />
                )}
              </div>
            </button>

            {/* 프로필 팝업 */}
            {popupParticipantId === p.id && selectedParticipant && (
              <UserProfilePopup
                participant={selectedParticipant}
                onClose={closePopup}
                onInvite={closePopup}
                style={{ top: "50%", right: "calc(100% + 8px)", transform: "translateY(-50%)" }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
