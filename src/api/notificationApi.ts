import { api } from "./axiosInstance";

export interface NotificationSettings {
  [type: string]: boolean;
}

export const notificationApi = {
  getSettings: async (): Promise<NotificationSettings> => {
    const { data } = await api.get("/api/notifications/settings");
    return data.data as NotificationSettings;
  },

  updateSetting: async (type: string, enabled: boolean): Promise<void> => {
    await api.patch(`/api/notifications/settings/${type}`, { enabled });
  },

  send: async (body: Record<string, unknown>): Promise<void> => {
    await api.post("/api/notifications", body);
  },

  subscribe: (): EventSource => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null;
    const base = process.env.NEXT_PUBLIC_API_URL ?? "";
    return new EventSource(
      `${base}/api/notifications/subscribe?token=${token ?? ""}`
    );
  },
};
