"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight, MicOff } from "lucide-react";
import { Participant } from "./types";

interface ParticipantStripProps {
  participants: Participant[];
  speakingId: string;
}

function ParticipantTile({
  participant,
  isSpeaking,
}: {
  participant: Participant;
  isSpeaking: boolean;
}) {
  return (
    <div
      className={`relative shrink-0 w-[152px] h-[86px] rounded-[8px] overflow-hidden bg-[#2a2a2a] ${
        isSpeaking ? "ring-2 ring-[#4CAF50]" : ""
      }`}
    >
      {/* 비디오 목업 배경 */}
      {participant.isCameraOff ? (
        <div className="w-full h-full flex items-center justify-center bg-[#3a3a3a]">
          <div className="w-10 h-10 rounded-full bg-[#555] flex items-center justify-center text-white text-[16px] font-semibold">
            {participant.name[0]}
          </div>
        </div>
      ) : (
        <div
          className="w-full h-full"
          style={{
            background: `linear-gradient(135deg, #1a2a4a ${participant.id}0%, #2d1a4a)`,
          }}
        >
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-[#724BFD]/40 flex items-center justify-center text-white text-[14px] font-semibold">
              {participant.name[0]}
            </div>
          </div>
        </div>
      )}

      {/* 이름 + 뮤트 아이콘 */}
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 flex items-center gap-1 bg-gradient-to-t from-black/60 to-transparent">
        {participant.isMuted && (
          <MicOff size={10} className="text-[#FF4444] shrink-0" />
        )}
        <span className="text-white text-[11px] font-medium truncate">
          {participant.name}
          {participant.role && (
            <span className="text-[#AAAAAA] ml-1">({participant.role})</span>
          )}
        </span>
      </div>
    </div>
  );
}

export default function ParticipantStrip({
  participants,
  speakingId,
}: ParticipantStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -320, behavior: "smooth" });
  };

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 320, behavior: "smooth" });
  };

  return (
    <div className="relative flex items-center bg-black px-10 py-2 gap-2">
      {/* 왼쪽 화살표 */}
      <button
        onClick={scrollLeft}
        className="absolute left-2 z-10 w-7 h-7 flex items-center justify-center text-white hover:text-gray-300 transition-colors"
        aria-label="이전 참여자"
      >
        <ChevronLeft size={20} />
      </button>

      {/* 참여자 타일 목록 */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-hidden scroll-smooth mx-4"
      >
        {participants.map((p) => (
          <ParticipantTile
            key={p.id}
            participant={p}
            isSpeaking={p.id === speakingId}
          />
        ))}
      </div>

      {/* 오른쪽 화살표 */}
      <button
        onClick={scrollRight}
        className="absolute right-2 z-10 w-7 h-7 flex items-center justify-center text-white hover:text-gray-300 transition-colors"
        aria-label="다음 참여자"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
