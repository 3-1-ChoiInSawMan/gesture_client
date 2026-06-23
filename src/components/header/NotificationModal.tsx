import NotificationItem, { NotificationData } from "./NotificationItem";

interface Props {
  notifications: NotificationData[];
  isLoading: boolean;
  onClose: () => void;
  onRead: (notification: NotificationData) => void;
}

function isToday(value: string) {
  const date = new Date(value);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

function isYesterday(value: string) {
  const date = new Date(value);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
}

export default function NotificationModal({
  notifications,
  isLoading,
  onClose,
  onRead,
}: Props) {
  const today = notifications.filter((n) => isToday(n.raw.created_at));
  const yesterday = notifications.filter((n) => isYesterday(n.raw.created_at));
  const older = notifications.filter(
    (n) => !isToday(n.raw.created_at) && !isYesterday(n.raw.created_at),
  );

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
          {isLoading && (
            <div className="h-full flex items-center justify-center text-sm text-gray-400">
              알림을 불러오는 중입니다.
            </div>
          )}

          {!isLoading && notifications.length === 0 && (
            <div className="h-full flex items-center justify-center text-sm text-gray-400">
              받은 알림이 없습니다.
            </div>
          )}

          {!isLoading && today.length > 0 && (
            <div className="mb-4 border-b border-[#E6E9EE]">
              {today.map((n) => (
                <NotificationItem key={n.id} notification={n} onRead={onRead} />
              ))}
            </div>
          )}

          {!isLoading && yesterday.length > 0 && (
            <div className="mb-4 border-b border-[#E6E9EE]">
              <p className="text-sm font-semibold text-gray-500 mb-3">어제</p>
              {yesterday.map((n) => (
                <NotificationItem key={n.id} notification={n} onRead={onRead} />
              ))}
            </div>
          )}

          {!isLoading && older.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-3">이전</p>
              {older.map((n) => (
                <NotificationItem key={n.id} notification={n} onRead={onRead} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
