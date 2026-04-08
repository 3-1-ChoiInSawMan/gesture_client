import NotificationItem, { NotificationData } from "./NotificationItem";

const MOCK_NOTIFICATIONS: NotificationData[] = [
  {
    id: 1,
    user: "임영웅",
    handle: "now_im_young",
    action: "님이 친구 요청을 보냈습니다.",
    timeLabel: "1시간 전",
    type: "friend_request",
  },
  {
    id: 2,
    user: "임영웅",
    handle: "now_im_young",
    action: "님이 kc방에서 김하온(@noahmik)님을 언급했습니다.",
    timeLabel: "어제",
    type: "mention",
  },
];

interface Props {
  onClose: () => void;
}

export default function NotificationModal({ onClose }: Props) {
  const today = MOCK_NOTIFICATIONS.filter((n) => n.timeLabel !== "어제");
  const yesterday = MOCK_NOTIFICATIONS.filter((n) => n.timeLabel === "어제");

  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div
        className="absolute right-0 top-12 z-40 bg-white rounded-2xl overflow-hidden"
        style={{
          width: "439px",
          height: "608px",
          boxShadow: "0 4px 32px 0 rgba(0,0,0,0.13)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-full overflow-y-auto px-5 py-5">
          {today.length > 0 && (
            <div className="mb-4 border-b border-[#E6E9EE]">
              {today.map((n) => (
                <NotificationItem key={n.id} notification={n} />
              ))}
            </div>
          )}

          {yesterday.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-3">어제</p>
              {yesterday.map((n) => (
                <NotificationItem key={n.id} notification={n} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
