import { api } from "./axiosInstance";

export interface QuickAction {
  name: string;
  mediaUrl: string;
}

export interface QuickSlot {
  actionName: string;
  mediaUrl: string;
}

export const quickSlotApi = {
  getAll: async (): Promise<QuickAction[]> => {
    try {
      const { data } = await api.get("/quick-slots");
      const body = data.data ?? data;
      return (body?.quickActions ?? []) as QuickAction[];
    } catch {
      return [];
    }
  },

  getMy: async (): Promise<(QuickSlot | null)[]> => {
    try {
      const { data } = await api.get("/quick-slots/me");
      const body = data.data ?? data;
      return (body?.quickSlots ?? []) as (QuickSlot | null)[];
    } catch {
      return [];
    }
  },

  update: async (slots: ({ actionName: string; mediaUrl: string } | null)[]): Promise<void> => {
    await api.patch("/quick-slots", { quickSlots: slots });
  },
};
