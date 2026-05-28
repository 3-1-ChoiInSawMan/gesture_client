"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { notificationApi, NotificationSetting } from "@/api/notificationApi";

const STORAGE_KEY = "notification-settings";

const LABEL_MAP: Record<string, { label: string; sub: string }> = {
  FRIEND: { label: "친구 알림", sub: "친구 요청이 왔을 때 알림" },
  SERVICE_NOTICE: { label: "서비스 공지사항", sub: "새로운 기능 및 업데이트 알림" },
  CALL_ROOM: { label: "통화방 알림", sub: "영상 통화 시작 알림" },
  CHAT_NOTICE: { label: "채팅 공지 알림", sub: "채팅방 공지가 올라왔을 때 알림" },
  MENTION: { label: "멘션 알림", sub: "채팅에서 나를 멘션했을 때 알림" },
  CHAT_ROOM_INVITATION: { label: "채팅방 초대 알림", sub: "채팅방에 초대받았을 때 알림" },
};

const DEFAULTS: NotificationSetting[] = [
  { type: "FRIEND", enabled: true },
  { type: "SERVICE_NOTICE", enabled: true },
  { type: "CALL_ROOM", enabled: true },
  { type: "CHAT_NOTICE", enabled: true },
  { type: "MENTION", enabled: true },
  { type: "CHAT_ROOM_INVITATION", enabled: true },
];

function loadFromStorage(): NotificationSetting[] {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as NotificationSetting[];
  } catch {
    // 파싱 실패 시 기본값
  }
  return DEFAULTS;
}

function NotificationRow({
  type,
  enabled,
  onChange,
}: {
  type: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const info =
    LABEL_MAP[type] ??
    LABEL_MAP[type.toUpperCase()] ??
    { label: type, sub: "" };
  return (
    <div className="flex items-center justify-between px-5 py-0 flex-1 min-h-[42px]">
      <div className="flex flex-col gap-0.5">
        <p className="text-[13px] font-medium text-[#333333]">{info.label}</p>
        {info.sub && <p className="text-[11px] text-[#AAAAAA]">{info.sub}</p>}
      </div>
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-[#724BFD] cursor-pointer shrink-0"
      />
    </div>
  );
}

export default function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSetting[]>(DEFAULTS);

  useEffect(() => {
    notificationApi
      .getSettings()
      .then((data) => {
        if (data.length > 0) {
          setSettings(data);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
      })
      .catch(() => {
        // API 실패 시 localStorage 값으로 복원
        const local = loadFromStorage();
        setSettings(local);
      });
  }, []);

  const handleChange = async (type: string, enabled: boolean) => {
    const updated = settings.map((s) =>
      s.type === type ? { ...s, enabled } : s
    );
    setSettings(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // 백엔드 준비되면 자동으로 저장됨
    notificationApi.updateSetting(type, enabled).catch(() => {});
  };

  return (
    <div className="flex flex-col gap-3 flex-1">
      <div className="flex items-center gap-2">
        <Bell size={17} className="text-[#724BFD]" />
        <p className="text-[16px] font-bold text-[#333333]">알림 설정</p>
      </div>
      <div className="flex flex-col border border-[#EEEEEE] rounded-[14px] overflow-hidden divide-y divide-[#EEEEEE] flex-1">
        {settings.map((item) => (
          <NotificationRow
            key={item.type}
            type={item.type}
            enabled={item.enabled}
            onChange={(enabled) => handleChange(item.type, enabled)}
          />
        ))}
      </div>
    </div>
  );
}
