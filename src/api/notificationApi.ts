import { api } from "./axiosInstance";

export interface NotificationSetting {
  type: string;
  enabled: boolean;
}

export interface NotificationActor {
  idx?: number;
  nickname?: string;
  user_id?: string;
  profile_image_url?: string | null;
}

export interface NotificationRecord {
  idx: number;
  type: string;
  is_read: boolean;
  content: string;
  actor?: NotificationActor | null;
  target_id?: string | null;
  created_at: string;
  read?: boolean;
}

type NotificationPayload = {
  notifications?: NotificationRecord[];
  notification?: NotificationRecord;
};

function resolveApiBaseUrl(): string {
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    return "/api/v1";
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "";
}

function normalizeNotifications(payload: unknown): NotificationRecord[] {
  const body = (payload as { data?: NotificationPayload } | null)?.data ?? payload;
  const notifications = (body as NotificationPayload | null)?.notifications;
  if (!Array.isArray(notifications)) return [];
  return notifications.map((item) => ({
    ...item,
    idx: item.idx ?? (item as unknown as { notification_id?: number }).notification_id ?? 0,
    is_read: item.is_read ?? item.read ?? false,
    read: item.read ?? item.is_read ?? false,
  }));
}

function parseSseChunk(
  chunk: string,
  onMessage: (payload: unknown) => void,
): string {
  const normalized = chunk.replace(/\r\n/g, "\n");
  const events = normalized.split("\n\n");
  const rest = events.pop() ?? "";

  events.forEach((eventText) => {
    const dataLines = eventText
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim());

    if (dataLines.length === 0) return;

    const data = dataLines.join("\n");
    if (!data || data === "[DONE]") return;

    try {
      onMessage(JSON.parse(data));
    } catch {
      onMessage(data);
    }
  });

  return rest;
}

export const notificationApi = {
  getSettings: async (): Promise<NotificationSetting[]> => {
    const { data } = await api.get("/notifications/settings");
    const body = data.data ?? data;
    return (
      body?.notification_settings ??
      body?.notificationSettings ??
      body?.settings ??
      []
    ) as NotificationSetting[];
  },

  updateSetting: async (type: string, enabled: boolean): Promise<void> => {
    await api.patch(`/notifications/settings/${type}`, { enabled });
  },

  send: async (body: Record<string, unknown>): Promise<void> => {
    await api.post("/notifications", body);
  },

  markAsRead: async (notificationIdx: number): Promise<NotificationRecord | null> => {
    const { data } = await api.patch(`/notifications/${notificationIdx}/read`);
    const body = data.data ?? data;
    const notification = body?.notification;
    if (!notification) return null;
    return {
      ...notification,
      idx: notification.idx ?? notification.notification_id ?? notificationIdx,
      is_read: notification.is_read ?? notification.read ?? true,
      read: notification.read ?? notification.is_read ?? true,
    } as NotificationRecord;
  },

  subscribe: (
    onNotifications: (notifications: NotificationRecord[]) => void,
    onError?: (error: unknown) => void,
  ): (() => void) => {
    const controller = new AbortController();

    const run = async () => {
      try {
        const token =
          typeof window !== "undefined"
            ? localStorage.getItem("accessToken")
            : null;
        const response = await fetch(`${resolveApiBaseUrl()}/notifications/`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Notification subscribe failed: ${response.status}`);
        }

        const contentType = response.headers.get("content-type") ?? "";

        if (!response.body || !contentType.includes("text/event-stream")) {
          const payload = await response.json();
          onNotifications(normalizeNotifications(payload));
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!controller.signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer = parseSseChunk(
            buffer + decoder.decode(value, { stream: true }),
            (payload) => onNotifications(normalizeNotifications(payload)),
          );
        }
      } catch (error) {
        if (!controller.signal.aborted) onError?.(error);
      }
    };

    run();

    return () => controller.abort();
  },
};
