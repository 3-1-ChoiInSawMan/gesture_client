import axios from "axios";

export interface QuickAction {
  name: string;
  mediaUrl: string;
}

export interface QuickSlot {
  actionName: string;
  mediaUrl: string;
}

type QuickSlotValue = QuickSlot | null;
type QuickSlotMap = Record<string, QuickSlotValue>;

const SLOT_COUNT = 5;

function resolveQuickSlotBaseUrl(): string {
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    return "/api";
  }

  const base = process.env.NEXT_PUBLIC_API_URL ?? "";
  return base.replace(/\/api\/v1\/?$/, "/api");
}

const quickSlotHttp = axios.create({
  baseURL: resolveQuickSlotBaseUrl(),
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

quickSlotHttp.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function normalizeQuickActions(value: unknown): QuickAction[] {
  if (Array.isArray(value)) return value as QuickAction[];
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, QuickAction>);
  }
  return [];
}

function normalizeQuickSlots(value: unknown): QuickSlotValue[] {
  if (Array.isArray(value)) {
    return Array.from({ length: SLOT_COUNT }, (_, index) => {
      const slot = value[index];
      return slot && typeof slot === "object" ? (slot as QuickSlot) : null;
    });
  }

  if (value && typeof value === "object") {
    const slots = value as QuickSlotMap;
    return Array.from({ length: SLOT_COUNT }, (_, index) => {
      const slot = slots[`slot${index + 1}`];
      return slot && typeof slot === "object" ? slot : null;
    });
  }

  return Array.from({ length: SLOT_COUNT }, () => null);
}

function toQuickSlotMap(slots: QuickSlotValue[]): QuickSlotMap {
  return Array.from({ length: SLOT_COUNT }).reduce<QuickSlotMap>((acc, _, index) => {
    acc[`slot${index + 1}`] = slots[index] ?? null;
    return acc;
  }, {});
}

export const quickSlotApi = {
  slotCount: SLOT_COUNT,

  getAll: async (): Promise<QuickAction[]> => {
    const { data } = await quickSlotHttp.get("/quick-slots");
    const body = data.data ?? data;
    return normalizeQuickActions(body?.quickActions);
  },

  getMy: async (): Promise<QuickSlotValue[]> => {
    const { data } = await quickSlotHttp.get("/quick-slots/me");
    const body = data.data ?? data;
    return normalizeQuickSlots(body?.quickSlots);
  },

  update: async (slots: QuickSlotValue[]): Promise<QuickSlotValue[]> => {
    const { data } = await quickSlotHttp.patch("/quick-slots", {
      quickSlots: toQuickSlotMap(slots),
    });
    const body = data.data ?? data;
    return normalizeQuickSlots(body?.quickSlots);
  },
};
