import { api } from "./axiosInstance";

export interface NotificationSetting {
  type: string;
  enabled: boolean;
}

export const notificationApi = {
  getSettings: async (): Promise<NotificationSetting[]> => {
    const { data } = await api.get("/notifications/settings");
    const body = data.data ?? data;
    return (body?.notificationSettings ?? body?.settings ?? []) as NotificationSetting[];
  },

  updateSetting: async (type: string, enabled: boolean): Promise<void> => {
    await api.patch(`/notifications/settings/${type}`, { enabled });
  },

  send: async (body: Record<string, unknown>): Promise<void> => {
    await api.post("/notifications", body);
  },

  subscribe: (): EventSource => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null;
    const base = process.env.NEXT_PUBLIC_API_URL ?? "";
    return new EventSource(
      `${base}/notifications/subscribe?token=${token ?? ""}`
    );
  },
};
