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

export interface PresetQuickSlot {
  quickSlotId: number;
  name: string;
  iconUuid: string;
  iconUrl: string;
  order: number;
}

export interface QuickSlotPreset {
  userIdx: number;
  quickSlots: PresetQuickSlot[];
  updatedAt: string;
}

type QuickSlotListBody = {
  quickSlots?: unknown[];
};

type QuickSlotPresetBody = {
  preset?: {
    userIdx?: number;
    quickSlots?: unknown[];
    updatedAt?: string;
  };
};

function normalizeAvailableSlots(value: unknown): QuickSlot[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
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

function normalizePreset(value: QuickSlotPresetBody["preset"]): QuickSlotPreset {
  const quickSlots = Array.isArray(value?.quickSlots)
    ? value.quickSlots
        .filter(
          (item): item is Record<string, unknown> =>
            !!item && typeof item === "object"
        )
        .map((item) => ({
          quickSlotId: Number(item.quickSlotId ?? 0),
          name: String(item.name ?? ""),
          iconUuid: String(item.iconUuid ?? ""),
          iconUrl: String(item.iconUrl ?? ""),
          order: Number(item.order ?? 0),
        }))
        .filter((item) => item.quickSlotId > 0)
        .sort((a, b) => a.order - b.order)
    : [];

  return {
    userIdx: Number(value?.userIdx ?? 0),
    quickSlots,
    updatedAt: String(value?.updatedAt ?? ""),
  };
}

export const quickSlotApi = {
  getAvailable: async (): Promise<QuickSlot[]> => {
    const { data } = await api.get("/quick-slot");
    const body = (data.data ?? data) as QuickSlotListBody;
    return normalizeAvailableSlots(body.quickSlots);
  },

  getPreset: async (): Promise<QuickSlotPreset> => {
    const { data } = await api.get("/quick-slot/preset");
    const body = (data.data ?? data) as QuickSlotPresetBody;
    return normalizePreset(body.preset);
  },

  updatePreset: async (quickSlotIds: number[]): Promise<QuickSlotPreset> => {
    const { data } = await api.patch("/quick-slot/preset", { quickSlotIds });
    const body = (data.data ?? data) as QuickSlotPresetBody;
    return normalizePreset(body.preset);
  },
};
