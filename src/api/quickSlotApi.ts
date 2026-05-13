import { api } from "./axiosInstance";

export interface QuickSlot {
  id: string;
  text: string;
  order: number;
}

export interface UpdateQuickSlotsRequest {
  slots: { id?: string; text: string; order: number }[];
}

export const quickSlotApi = {
  getAll: async (): Promise<QuickSlot[]> => {
    const { data } = await api.get("/api/quick-slots");
    return data.data as QuickSlot[];
  },

  getMy: async (): Promise<QuickSlot[]> => {
    const { data } = await api.get("/api/quick-slots/me");
    return data.data as QuickSlot[];
  },

  update: async (body: UpdateQuickSlotsRequest): Promise<QuickSlot[]> => {
    const { data } = await api.patch("/api/quick-slots", body);
    return data.data as QuickSlot[];
  },
};
