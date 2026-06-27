import Image from "next/image";
import { NotificationRecord } from "@/api/notificationApi";
import { friendApi } from "@/api/friendApi";
import { toast } from "react-toastify";
import { useState } from "react";

export interface NotificationData {
  id: number | string;
  user: string;
  handle: string;
  action: string;
  timeLabel: string;
  thumbnail?: string;
  type: string;
  isRead: boolean;
  raw: NotificationRecord;
}

interface Props {
  notification: NotificationData;
  onRead: (notification: NotificationData) => void;
}

export default function NotificationItem({ notification: n, onRead }: Props) {
  const [processed, setProcessed] = useState(false);
  const friendshipIdx = Number(n.raw.target_id ?? 0);
  const isFriendRequest =
    n.type.toUpperCase().includes("FRIEND") && friendshipIdx > 0;

  const process = async (accept: boolean) => {
    try {
      if (accept) await friendApi.acceptRequest(friendshipIdx);
      else await friendApi.denyRequest(friendshipIdx);
      setProcessed(true);
      onRead(n);
      toast.success(accept ? "친구 요청을 수락했습니다." : "친구 요청을 거절했습니다.");
    } catch {
      toast.error("친구 요청 처리에 실패했습니다.");
    }
  };

  return (
    <div
      onClick={() => onRead(n)}
      className={`w-full text-left flex items-center gap-3 py-3 border-b border-gray-100 last:border-0 transition-colors hover:bg-[#F8F7FF] ${
        n.isRead ? "opacity-60" : ""
      }`}
    >
      <div className="relative w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
        <Image
          src={`https://api.dicebear.com/7.x/thumbs/svg?seed=${n.handle || n.user}`}
          alt={n.user}
          unoptimized
          fill
          className="object-cover"
        />
      </div>

      <div className="flex-1 text-sm text-gray-700 leading-snug min-w-0">
        <div className="line-clamp-2">
          <span className="font-semibold text-gray-900">{n.user}</span>
          {n.handle && <span className="text-gray-500">(@{n.handle})</span>}
          <span>{n.action}</span>
        </div>
        <span className="text-xs text-gray-400">{n.timeLabel}</span>
      </div>

      {!n.isRead && (
        <span className="w-2 h-2 rounded-full bg-[#724BFD] flex-shrink-0" />
      )}

      {isFriendRequest && !processed && (
        <div className="flex gap-1" onClick={(event) => event.stopPropagation()}>
          <button onClick={() => process(false)} className="h-7 px-2 text-[11px] text-[#777777]">거절</button>
          <button onClick={() => process(true)} className="h-7 px-2 rounded-[6px] bg-[#724BFD] text-[11px] text-white">수락</button>
        </div>
      )}

      {n.thumbnail && (
        <div className="relative w-12 h-12 rounded-lg bg-gray-200 flex-shrink-0 overflow-hidden">
          <Image src={n.thumbnail} alt="알림 이미지" fill className="object-cover" />
        </div>
      )}
    </div>
  );
}
