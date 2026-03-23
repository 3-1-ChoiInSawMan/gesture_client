"use client";

import { useState } from "react";
import { Bell } from "lucide-react";

const notificationItems = [
  {
    label: "서비스 공지사항",
    sub: "새로운 기능 및 업데이트 알림",
    defaultChecked: false,
  },
  { label: "통화방 알림", sub: "영상 통화 시작 알림", defaultChecked: true },
  { label: "공지 알림", sub: "채팅방 공지 알림", defaultChecked: true },
  { label: "친구 알림", sub: "친구 요청이 왔을 때 알림", defaultChecked: true },
];

function NotificationRow({
  label,
  sub,
  defaultChecked,
}: {
  label: string;
  sub: string;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between px-5 py-3.25">
      <div className="flex flex-col">
        <p className="text-[13px] font-medium text-[#333333]">{label}</p>
        <p className="text-[11px] text-[#AAAAAA]">{sub}</p>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        className="w-4 h-4 accent-[#724BFD] cursor-pointer"
      />
    </div>
  );
}

export default function NotificationSettings() {
  return (
    <div className="flex flex-col gap-3 flex-1">
      <div className="flex items-center gap-2">
        <Bell size={17} className="text-[#724BFD]" />
        <p className="text-[16px] font-bold text-[#333333]">알림 설정</p>
      </div>
      <div className="flex flex-col border border-[#EEEEEE] rounded-[14px] overflow-hidden divide-y divide-[#EEEEEE] h-full">
        {notificationItems.map((item) => (
          <NotificationRow key={item.label} {...item} />
        ))}
      </div>
    </div>
  );
}
