"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { chatRoomApi } from "@/api/chatRoomApi";
import { useChatStore } from "@/store/chatStore";

interface RecentChat {
  chatRoomIdx: number;
  name: string;
  message: string;
  time: string;
  timestamp: number;
}

function formatRecentTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const today = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const time = date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (today) return time;
  if (date.toDateString() === yesterday.toDateString()) return `어제 ${time}`;
  return date.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}

export default function RecentChats() {
  const router = useRouter();
  const selectRoom = useChatStore((state) => state.selectRoom);
  const [chats, setChats] = useState<RecentChat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadRecentChats = async () => {
      try {
        const rooms = (await chatRoomApi.getRooms()).filter(
          (room) => room.roomType === "dm"
        );
        const results = await Promise.allSettled(
          rooms.map(async (room): Promise<RecentChat> => {
            const page = await chatRoomApi.getMessages(room.chatRoomIdx, {
              size: 1,
            });
            const latest = page.messages[0];
            const latestAt = latest?.createdAt ?? room.createdAt;

            return {
              chatRoomIdx: room.chatRoomIdx,
              name: room.name,
              message:
                latest?.type === "FILE"
                  ? "파일"
                  : latest?.message ?? "아직 메시지가 없습니다.",
              time: formatRecentTime(latestAt),
              timestamp: new Date(latestAt).getTime() || 0,
            };
          })
        );

        if (cancelled) return;
        setChats(
          results
            .filter(
              (result): result is PromiseFulfilledResult<RecentChat> =>
                result.status === "fulfilled"
            )
            .map((result) => result.value)
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 3)
        );
      } catch {
        if (!cancelled) setChats([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadRecentChats();
    return () => {
      cancelled = true;
    };
  }, []);

  const openChat = (chatRoomIdx: number) => {
    selectRoom(`chat-${chatRoomIdx}`);
    router.push("/friends");
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <MessageSquare size={17} className="text-[#724BFD]" />
        <p className="text-[16px] font-bold text-[#333333]">최근 채팅방</p>
      </div>
      <div className="flex flex-col overflow-hidden rounded-[14px] border border-[#EEEEEE] divide-y divide-[#EEEEEE]">
        {loading && (
          <p className="px-5 py-6 text-center text-[12px] text-[#AAAAAA]">
            최근 채팅방을 불러오는 중입니다.
          </p>
        )}
        {!loading && chats.length === 0 && (
          <p className="px-5 py-6 text-center text-[12px] text-[#AAAAAA]">
            최근 채팅방이 없습니다.
          </p>
        )}
        {chats.map((item) => (
          <button
            key={item.chatRoomIdx}
            onClick={() => openChat(item.chatRoomIdx)}
            className="flex w-full min-w-0 items-center gap-4 overflow-hidden px-5 py-3 text-left hover:bg-[#F5F5F5]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8E2FF] text-[13px] font-semibold text-[#724BFD]">
              {item.name[0] ?? "?"}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="truncate text-[13px] font-semibold text-[#333333]">
                {item.name}
              </p>
              <p className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[12px] text-[#AAAAAA]">
                {item.message}
              </p>
            </div>
            <p className="shrink-0 text-[11px] text-[#AAAAAA]">{item.time}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
