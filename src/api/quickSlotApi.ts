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
    const { data } = await api.get("/quick-slots");
    const body = data.data ?? data;
    return (body?.quickActions ?? []) as QuickAction[];
  },

  getMy: async (): Promise<(QuickSlot | null)[]> => {
    const { data } = await api.get("/quick-slots/me");
    const body = data.data ?? data;
    return (body?.quickSlots ?? []) as (QuickSlot | null)[];
  },

  update: async (slots: { name: string; mediaUrl: string }[]): Promise<void> => {
    await api.patch("/quick-slots/me", { slots });
  },
};
