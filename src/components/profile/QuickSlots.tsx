"use client";

import { Settings } from "lucide-react";

const slots = [
  { emoji: "🤘", label: "신나요", bg: "bg-[#FFF3E8]" },
  { emoji: "👍", label: "슬퍼요", bg: "bg-[#FFF8E8]" },
  { emoji: "🙏", label: "감사합니다", bg: "bg-[#FFF3E8]" },
  { emoji: "👋", label: "안녕하세요", bg: "bg-[#EDFFF3]" },
];

export default function QuickSlots() {
  return (
    <div className="flex flex-col gap-3 flex-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings size={17} className="text-[#724BFD]" />
          <p className="text-[16px] font-bold text-[#333333]">
            수어 퀵 슬롯 관리
          </p>
        </div>
        <div className="flex items-center gap-1 cursor-pointer">
          <Settings size={13} className="text-[#724BFD]" />
          <p className="text-[13px] text-[#724BFD]">슬롯 관리</p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3 flex-1">
        {slots.map((slot) => (
          <div
            key={slot.label}
            className={`${slot.bg} rounded-[14px] flex flex-col items-center justify-center gap-2 cursor-pointer`}
          >
            <span className="text-[28px]">{slot.emoji}</span>
            <p className="text-[12px] font-medium text-[#333333]">
              {slot.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
