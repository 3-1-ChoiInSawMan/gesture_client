import Image from "next/image";

export interface NotificationData {
  id: number;
  user: string;
  handle: string;
  action: string;
  timeLabel: string;
  thumbnail?: string;
  type: "friend_request" | "mention";
}

interface Props {
  notification: NotificationData;
}

export default function NotificationItem({ notification: n }: Props) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="relative w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
        <Image
          src={`https://api.dicebear.com/7.x/thumbs/svg?seed=${n.handle}`}
          alt={n.user}
          unoptimized
          fill
          className="object-cover"
        />
      </div>

      <div className="flex-1 text-sm text-gray-700 leading-snug">
        <span className="font-semibold text-gray-900">{n.user}</span>
        <span className="text-gray-500">(@{n.handle})</span>
        {n.action}
        {n.type !== "mention" && (
          <span className="ml-2 text-xs text-gray-400">{n.timeLabel}</span>
        )}
      </div>

      {n.type === "friend_request" && (
        <button className="flex-shrink-0 bg-[#724BFD] text-white text-sm px-4 py-1.5 rounded-lg hover:bg-[#5f3de0] transition-colors">
          수락
        </button>
      )}
      {n.type === "mention" && n.thumbnail && (
        <div className="relative w-12 h-12 rounded-lg bg-gray-200 flex-shrink-0 overflow-hidden">
          <Image src={n.thumbnail} alt="썸네일" fill className="object-cover" />
        </div>
      )}
    </div>
  );
}