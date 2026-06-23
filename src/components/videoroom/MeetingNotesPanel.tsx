"use client";

import { X } from "lucide-react";

export interface MeetingNotesDraft {
  title: string;
  displayDateTime: string;
  attendeesText: string;
  content: string;
}

interface MeetingNotesPanelProps {
  draft: MeetingNotesDraft;
  onChange: (draft: MeetingNotesDraft) => void;
  onClose: () => void;
}

export default function MeetingNotesPanel({
  draft,
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
          <input
            value={draft.displayDateTime}
            onChange={(event) => onChange({ ...draft, displayDateTime: event.target.value })}
            className="h-10 rounded-[8px] border border-[#E6E9EE] px-3 text-[13px] text-[#333333] outline-none focus:border-[#724BFD]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-semibold text-[#333333]">참석자</span>
          <textarea
            value={draft.attendeesText}
            onChange={(event) => onChange({ ...draft, attendeesText: event.target.value })}
            rows={3}
            className="resize-none rounded-[8px] border border-[#E6E9EE] px-3 py-2 text-[13px] text-[#333333] leading-6 outline-none focus:border-[#724BFD]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[12px] font-semibold text-[#333333]">내용</span>
          <textarea
            value={draft.content}
            onChange={(event) => onChange({ ...draft, content: event.target.value })}
            placeholder="AI가 회의 내용을 채워줄 예정입니다."
            rows={7}
            className="resize-none rounded-[8px] border border-[#E6E9EE] px-3 py-2 text-[13px] text-[#333333] leading-6 outline-none focus:border-[#724BFD] placeholder:text-[#AAAAAA]"
          />
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
