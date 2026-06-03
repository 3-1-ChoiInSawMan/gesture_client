"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, MicOff } from "lucide-react";
import { Participant } from "./types";
import StreamVideo from "./StreamVideo";

const PAGE_SIZE = 4;

interface ParticipantStripProps {
  participants: Participant[];
  speakingId: string;
  onSelectParticipant: (id: string) => void;
  myStream: MediaStream | null;
  isCameraOn: boolean;
  screenStream: MediaStream | null;
}

function ParticipantTile({
  participant,
  isSpeaking,
  onDoubleClick,
  myStream,
  isCameraOn,
  screenStream,
}: {
  participant: Participant;
  isSpeaking: boolean;
  onDoubleClick: () => void;
  myStream: MediaStream | null;
  isCameraOn: boolean;
  screenStream: MediaStream | null;
}) {
  const showMyCamera = participant.id === "me" && isCameraOn && myStream;
  const showScreenShare = participant.id === "screen-share" && screenStream;
  const showRemoteStream = participant.id !== "me" && participant.id !== "screen-share" && !!participant.stream && !participant.isCameraOff;

  return (
    <div
      onDoubleClick={onDoubleClick}
      className={`relative shrink-0 w-[260px] h-[142px] rounded-[8px] overflow-hidden bg-[#2a2a2a] cursor-pointer ${
        isSpeaking ? "ring-2 ring-[#724BFD]" : ""
      }`}
    >
      {showScreenShare ? (
        <StreamVideo
          stream={screenStream}
          muted
          className="w-full h-full object-contain bg-black"
        />
      ) : showMyCamera ? (
        <StreamVideo
          stream={myStream}
          mirrored
          muted
          className="w-full h-full object-cover"
        />
      ) : showRemoteStream ? (
        <StreamVideo
          stream={participant.stream!}
          muted
          className="w-full h-full object-cover"
        />
      ) : participant.isCameraOff ? (
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

      <div className="absolute bottom-0 left-0 right-0 px-2 py-1 flex items-center gap-1 bg-gradient-to-t from-black/60 to-transparent">
        {participant.isMuted && (
          <MicOff size={10} className="text-[#FF4444] shrink-0" />
        )}
        <span className="text-white text-[11px] font-medium truncate">
          {participant.name}
          {participant.isHost && (
            <span className="text-[#AAAAAA] ml-1">(방장)</span>
          )}
        </span>
      </div>
    </div>
  );
}

export default function ParticipantStrip({
  participants,
  speakingId,
  onSelectParticipant,
  myStream,
  isCameraOn,
  screenStream,
}: ParticipantStripProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(participants.length / PAGE_SIZE);
  const paged = participants.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const hasPrev = page > 0;
  const hasNext = page < totalPages - 1;

  return (
    <div className="flex items-center justify-center bg-black px-4 pt-3 pb-0 gap-2">
      <button
        onClick={() => setPage((p) => p - 1)}
        disabled={!hasPrev}
        className="w-7 h-7 flex items-center justify-center text-white disabled:opacity-20 hover:text-gray-300 transition-colors shrink-0"
        aria-label="이전 참여자"
      >
        <ChevronLeft size={20} />
      </button>

      <div className="flex items-center gap-2">
        {paged.map((p) => (
          <ParticipantTile
            key={p.id}
            participant={p}
            isSpeaking={p.id === speakingId}
            onDoubleClick={() => onSelectParticipant(p.id)}
            myStream={myStream}
            isCameraOn={isCameraOn}
            screenStream={screenStream}
          />
        ))}
        {Array.from({ length: PAGE_SIZE - paged.length }).map((_, i) => (
          <div key={`empty-${i}`} className="shrink-0 w-[260px] h-[142px]" />
        ))}
      </div>

      <button
        onClick={() => setPage((p) => p + 1)}
        disabled={!hasNext}
        className="w-7 h-7 flex items-center justify-center text-white disabled:opacity-20 hover:text-gray-300 transition-colors shrink-0"
        aria-label="다음 참여자"
      >
        <ChevronRight size={20} />
      </button>

      {totalPages > 1 && (
        <div className="flex gap-1 shrink-0">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i === page ? "bg-white" : "bg-white/30"
              }`}
              aria-label={`${i + 1}페이지`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
