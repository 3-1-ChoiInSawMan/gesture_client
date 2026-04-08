"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface MeetingNotesPanelProps {
  isHost: boolean;
  onClose: () => void;
  onDismissNotice?: () => void;
}

const FIELDS = [
  { key: "title", label: "회의 제목" },
  { key: "datetime", label: "회의 일시" },
  { key: "auditor", label: "감사자" },
  { key: "content", label: "회의 내용" },
  { key: "aiSummary", label: "AI 회의 요약" },
  { key: "conclusion", label: "결론" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

export default function MeetingNotesPanel({
  isHost,
  onClose,
  onDismissNotice,
}: MeetingNotesPanelProps) {
  const [notes, setNotes] = useState<Record<FieldKey, string>>({
    title: "",
    datetime: "",
    auditor: "",
    content: "",
    aiSummary: "",
    conclusion: "",
  });

  if (!isHost) {
    return (
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-3 bg-black/80 text-white">
        <span className="text-[14px] font-medium">
          회의록은 방장만 생성 가능합니다.
        </span>
        <button
          onClick={onDismissNotice}
          className="shrink-0 h-[30px] px-4 bg-[#724BFD] text-white text-[12px] font-medium rounded-[8px] hover:bg-[#5f3de0] transition-colors"
        >
          확인
        </button>
      </div>
    );
  }

  return (
    <div className="w-[280px] shrink-0 flex flex-col bg-white border-l border-[#E6E9EE] h-full">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E6E9EE]">
        <span className="text-[14px] font-semibold text-[#333]">회의록</span>
        <button
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center text-[#AAAAAA] hover:text-[#333] transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* 필드 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1">
        {FIELDS.map(({ key, label }) => (
          <div
            key={key}
            className="flex flex-col gap-1 py-3 border-b border-[#F5F5F5] last:border-0"
          >
            <span className="text-[12px] font-semibold text-[#333]">
              {label}
            </span>
            <input
              type="text"
              placeholder={`${label} 입력`}
              value={notes[key]}
              onChange={(e) =>
                setNotes((prev) => ({ ...prev, [key]: e.target.value }))
              }
              className="w-full text-[12px] text-[#555] placeholder:text-[#CCCCCC] outline-none bg-transparent border-b border-transparent focus:border-[#724BFD] transition-colors pb-0.5"
            />
          </div>
        ))}
      </div>

      {/* 저장 버튼 */}
      <div className="px-4 py-3 border-t border-[#E6E9EE]">
        <button className="w-full h-[38px] bg-[#724BFD] text-white text-[13px] font-medium rounded-[10px] hover:bg-[#5f3de0] transition-colors">
          저장
        </button>
      </div>
    </div>
  );
}
