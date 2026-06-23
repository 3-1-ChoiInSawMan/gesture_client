"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import {
  notificationApi,
  NotificationRecord,
} from "@/api/notificationApi";
import NotificationModal from "./NotificationModal";
import { NotificationData } from "./NotificationItem";

function formatTimeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "방금 전";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}분 전`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}시간 전`;
  if (diffMs < day * 2) return "어제";

  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toNotificationData(notification: NotificationRecord): NotificationData {
  const actor = notification.actor;
  const user = actor?.nickname || actor?.user_id || "알림";
  const handle = actor?.user_id || "";
  const content = notification.content ?? "";
  const action = content.startsWith(user)
    ? content.slice(user.length)
    : ` ${content}`;

  return {
    id: notification.idx,
    user,
    handle,
    action,
    timeLabel: formatTimeLabel(notification.created_at),
    thumbnail: actor?.profile_image_url ?? undefined,
    type: notification.type,
    isRead: notification.is_read || notification.read || false,
    raw: notification,
  };
}

function mergeNotifications(
  prev: NotificationRecord[],
  next: NotificationRecord[],
): NotificationRecord[] {
  const byId = new Map<number, NotificationRecord>();
  [...prev, ...next].forEach((item) => {
    if (!item.idx) return;
    byId.set(item.idx, { ...byId.get(item.idx), ...item });
  });

  return Array.from(byId.values()).sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);

  useEffect(() => {
    const unsubscribe = notificationApi.subscribe(
      (incoming) => {
        setNotifications((prev) => mergeNotifications(prev, incoming));
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );

    return unsubscribe;
  }, []);

  const items = useMemo(
    () => notifications.map(toNotificationData),
    [notifications],
  );

  const unreadCount = items.filter((item) => !item.isRead).length;

  const handleRead = async (notification: NotificationData) => {
    if (notification.isRead) return;

    setNotifications((prev) =>
      prev.map((item) =>
        item.idx === notification.raw.idx
          ? { ...item, is_read: true, read: true }
          : item,
      ),
    );

    try {
      await notificationApi.markAsRead(notification.raw.idx);
    } catch {
      setNotifications((prev) =>
        prev.map((item) =>
          item.idx === notification.raw.idx
            ? { ...item, is_read: false, read: false }
            : item,
        ),
      );
    }
  };

  return (
    <div className="relative">
      <button
        className={`relative transition-colors ${
          isOpen
            ? "text-[#724BFD]"
            : "text-[#333333] hover:text-[#724BFD]"
        }`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="알림"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 min-w-4 h-4 px-1 rounded-full bg-[#724BFD] text-white text-[10px] leading-4 text-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationModal
          notifications={items}
          isLoading={isLoading}
          onClose={() => setIsOpen(false)}
          onRead={handleRead}
        />
      )}
    </div>
  );
}
