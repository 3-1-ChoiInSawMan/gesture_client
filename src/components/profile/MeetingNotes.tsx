"use client";

import { useEffect, useState } from "react";
import { ClipboardList, X } from "lucide-react";
import { getMeetingNotes, MeetingNoteRecord } from "@/lib/meetingNotes";

interface MeetingNotesProps {
  userId: string;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function MeetingNotes({ userId }: MeetingNotesProps) {
  const [notes, setNotes] = useState<MeetingNoteRecord[]>([]);
  const [selected, setSelected] = useState<MeetingNoteRecord | null>(null);

  useEffect(() => {
    setNotes(getMeetingNotes(userId));
  }, [userId]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <ClipboardList size={17} className="text-[#724BFD]" />
        <p className="text-[16px] font-bold text-[#333333]">회의록</p>
      </div>

      {notes.length === 0 ? (
        <div className="flex items-center justify-center border border-[#EEEEEE] rounded-[14px] min-h-[96px]">
          <p className="text-[13px] text-[#AAAAAA]">저장된 회의록이 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col border border-[#EEEEEE] rounded-[14px] overflow-hidden divide-y divide-[#EEEEEE]">
          {notes.slice(0, 5).map((note) => (
            <button
              key={note.id}
              onClick={() => setSelected(note)}
              className="text-left flex items-center gap-4 px-5 py-3 hover:bg-[#F5F5F5]"
            >
              <div className="w-9 h-9 rounded-full bg-[#E8E2FF] shrink-0 flex items-center justify-center">
                <ClipboardList size={16} className="text-[#724BFD]" />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#333333] truncate">
                  {note.title}
                </p>
                <p className="text-[12px] text-[#AAAAAA] truncate">
                  {note.roomTitle} · {note.attendees.join(", ")}
                </p>
              </div>
              <p className="text-[11px] text-[#AAAAAA] shrink-0">
                {formatDateTime(note.createdAt)}
              </p>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="w-[520px] max-w-full bg-white rounded-[14px] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#EEEEEE]">
              <p className="text-[16px] font-bold text-[#333333]">회의록 상세</p>
              <button
                onClick={() => setSelected(null)}
                title="닫기"
                className="w-8 h-8 flex items-center justify-center text-[#AAAAAA] hover:text-[#333333]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 flex flex-col gap-4">
              <div>
                <p className="text-[12px] font-semibold text-[#888888]">제목</p>
                <p className="mt-1 text-[15px] font-semibold text-[#333333]">{selected.title}</p>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-[#888888]">통화방</p>
                <p className="mt-1 text-[13px] text-[#555555]">{selected.roomTitle}</p>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-[#888888]">일시</p>
                <p className="mt-1 text-[13px] text-[#555555]">
                  {formatDateTime(selected.startedAt)} - {formatDateTime(selected.endedAt)}
                </p>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-[#888888]">참석자</p>
                <p className="mt-1 text-[13px] text-[#555555] leading-6">
                  {selected.attendees.join(", ")}
                </p>
              </div>
              <div className="rounded-[10px] bg-[#F7F7FA] px-4 py-3">
                <p className="text-[12px] leading-5 text-[#888888]">
                  회의 내용과 AI 요약은 백엔드 회의록 생성 API가 연결되면 이 영역에 표시됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
