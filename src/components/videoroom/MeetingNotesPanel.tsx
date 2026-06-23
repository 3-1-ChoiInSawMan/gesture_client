"use client";

import { X } from "lucide-react";

export interface MeetingNotesDraft {
  title: string;
}

interface MeetingNotesPanelProps {
  draft: MeetingNotesDraft;
  startedAt: Date;
  attendees: string[];
  onChange: (draft: MeetingNotesDraft) => void;
  onClose: () => void;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
  }).format(date);
}

export default function MeetingNotesPanel({
  draft,
  startedAt,
  attendees,
  onChange,
  onClose,
}: MeetingNotesPanelProps) {
  return (
    <aside className="w-[320px] shrink-0 flex flex-col bg-white border-l border-[#E6E9EE] h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E6E9EE]">
        <span className="text-[14px] font-semibold text-[#333333]">회의록</span>
        <button
          onClick={onClose}
          title="닫기"
          className="w-7 h-7 flex items-center justify-center text-[#AAAAAA] hover:text-[#333333] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="text-[12px] font-semibold text-[#333333]">회의록 제목</span>
          <input
            value={draft.title}
            onChange={(event) => onChange({ ...draft, title: event.target.value })}
            placeholder="회의록 제목을 입력하세요"
            className="h-10 rounded-[8px] border border-[#E6E9EE] px-3 text-[13px] text-[#333333] outline-none focus:border-[#724BFD]"
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-semibold text-[#333333]">일시</span>
          <div className="min-h-10 rounded-[8px] bg-[#F7F7FA] px-3 py-2 text-[13px] text-[#555555]">
            {formatDateTime(startedAt)}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-semibold text-[#333333]">참석자</span>
          <div className="rounded-[8px] bg-[#F7F7FA] px-3 py-2 text-[13px] text-[#555555] leading-6">
            {attendees.length > 0 ? attendees.join(", ") : "참석자 확인 중"}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-[#E6E9EE]">
        <p className="text-[12px] leading-5 text-[#888888]">
          통화를 나가면 입력한 제목으로 회의록이 생성됩니다.
        </p>
      </div>
    </aside>
  );
}
