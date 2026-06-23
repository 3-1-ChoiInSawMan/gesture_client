import { api } from "./axiosInstance";

export interface QuickSlot {
  idx: number;
  name: string;
  description: string;
  iconUuid: string;
  iconUrl: string;
  order: number;
  createdAt: string;
}

export interface QuickSlotUpdatePayload {
  name: string;
  description: string;
  iconUuid: string;
}

type QuickSlotBody = {
  quickSlots?: QuickSlot[];
  quickSlot?: QuickSlot;
};

function normalizeQuickSlots(value: unknown): QuickSlot[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Partial<QuickSlot> => !!item && typeof item === "object")
    .map((item) => ({
      idx: Number(item.idx ?? 0),
      name: String(item.name ?? ""),
      description: String(item.description ?? ""),
      iconUuid: String(item.iconUuid ?? ""),
      iconUrl: String(item.iconUrl ?? ""),
      order: Number(item.order ?? 0),
      createdAt: String(item.createdAt ?? ""),
    }))
    .filter((item) => item.idx > 0)
    .sort((a, b) => a.order - b.order);
}

export const quickSlotApi = {
  getMy: async (): Promise<QuickSlot[]> => {
    const { data } = await api.get("/quick-slot");
    const body = (data.data ?? data) as QuickSlotBody;
    return normalizeQuickSlots(body?.quickSlots);
  },

  update: async (
    quickSlotIdx: number,
    payload: QuickSlotUpdatePayload,
  ): Promise<QuickSlot> => {
    const { data } = await api.patch(`/quick-slot/${quickSlotIdx}`, payload);
    const body = (data.data ?? data) as QuickSlotBody;
    return body.quickSlot as QuickSlot;
  },

  remove: async (quickSlotIdx: number): Promise<void> => {
    await api.delete(`/quick-slot/${quickSlotIdx}`);
  },
};
