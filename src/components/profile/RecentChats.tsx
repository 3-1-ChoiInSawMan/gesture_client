"use client";

import { MessageSquare } from "lucide-react";

const chats = [
  { name: "김하은", msg: "kc에서 나가", time: "오후 2:30" },
  { name: "권민식", msg: "kc 들어와", time: "오후 2:19" },
  { name: "최윤정", msg: "콜록 콜록", time: "어제 오후 2:00" },
];

export default function RecentChats() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <MessageSquare size={17} className="text-[#724BFD]" />
        <p className="text-[16px] font-bold text-[#333333]">최근 채팅방</p>
      </div>
      <div className="flex flex-col border border-[#EEEEEE] rounded-[14px] overflow-hidden divide-y divide-[#EEEEEE]">
        {chats.map((item) => (
          <div
            key={item.name}
            className="flex items-center gap-4 px-5 py-3 hover:bg-[#F5F5F5] cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full bg-[#E8E2FF] shrink-0" />
            <div className="flex flex-col flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#333333]">
                {item.name}
              </p>
              <p className="text-[12px] text-[#AAAAAA] truncate">{item.msg}</p>
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
