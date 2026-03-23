"use client";

import { Video } from "lucide-react";

const activities = [
  {
    title: "수어 학습 스터디",
    sub: "참여한 통화방",
    time: "2시간 전",
    badge: "입실",
    badgeColor: "bg-green-100 text-green-600",
  },
  {
    title: "키는 160",
    sub: "내가 만든 통화방",
    time: "어제",
    badge: null,
    badgeColor: "",
  },
];

export default function RecentActivity() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video size={17} className="text-[#724BFD]" />
          <p className="text-[16px] font-bold text-[#333333]">내 활동</p>
        </div>
        <p className="text-[13px] text-[#724BFD] cursor-pointer">전체보기</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {activities.map((item) => (
          <div
            key={item.title}
            className="flex items-center gap-3 border border-[#EEEEEE] rounded-[14px] px-4 py-3"
          >
            <div className="w-9 h-9 rounded-full bg-[#E8E2FF] shrink-0" />
            <div className="flex flex-col flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#333333] truncate">
                {item.title}
              </p>
              <p className="text-[11px] text-[#AAAAAA]">{item.sub}</p>
              {item.badge && (
                <span
                  className={`mt-1 text-[10px] px-2 py-0.5 rounded-full w-fit ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#AAAAAA] shrink-0">
              {item.time}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
