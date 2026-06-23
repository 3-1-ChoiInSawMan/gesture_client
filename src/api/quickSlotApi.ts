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
const LOCAL_MY_SLOTS_KEY = "quick-slots:me";
const LOCAL_ACTIONS_KEY = "quick-slots:actions";
const ENABLE_API = process.env.NEXT_PUBLIC_ENABLE_QUICK_SLOT_API === "true";

const DEFAULT_ACTIONS: QuickAction[] = [
  { name: "안녕하세요", mediaUrl: "" },
  { name: "감사합니다", mediaUrl: "" },
  { name: "잠시만요", mediaUrl: "" },
  { name: "다시 말해주세요", mediaUrl: "" },
  { name: "수고하셨습니다", mediaUrl: "" },
];

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

function readLocalActions(): QuickAction[] {
  if (typeof window === "undefined") return DEFAULT_ACTIONS;
  try {
    const stored = localStorage.getItem(LOCAL_ACTIONS_KEY);
    if (!stored) return DEFAULT_ACTIONS;
    const parsed = JSON.parse(stored);
    const actions = normalizeQuickActions(parsed);
    return actions.length > 0 ? actions : DEFAULT_ACTIONS;
  } catch {
    return DEFAULT_ACTIONS;
  }
}

function readLocalSlots(): QuickSlotValue[] {
  if (typeof window === "undefined") return normalizeQuickSlots(null);
  try {
    return normalizeQuickSlots(JSON.parse(localStorage.getItem(LOCAL_MY_SLOTS_KEY) ?? "null"));
  } catch {
    return normalizeQuickSlots(null);
  }
}

function writeLocalSlots(slots: QuickSlotValue[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_MY_SLOTS_KEY, JSON.stringify(toQuickSlotMap(slots)));
}

export const quickSlotApi = {
  slotCount: SLOT_COUNT,

  getAll: async (): Promise<QuickAction[]> => {
    if (!ENABLE_API) return readLocalActions();

    try {
      const { data } = await quickSlotHttp.get("/quick-slots");
      const body = data.data ?? data;
      const actions = normalizeQuickActions(body?.quickActions);
      return actions.length > 0 ? actions : readLocalActions();
    } catch {
      return readLocalActions();
    }
  },

  getMy: async (): Promise<QuickSlotValue[]> => {
    if (!ENABLE_API) return readLocalSlots();

    try {
      const { data } = await quickSlotHttp.get("/quick-slots/me");
      const body = data.data ?? data;
      return normalizeQuickSlots(body?.quickSlots);
    } catch {
      return readLocalSlots();
    }
  },

  update: async (slots: QuickSlotValue[]): Promise<QuickSlotValue[]> => {
    const normalized = normalizeQuickSlots(slots);
    writeLocalSlots(normalized);

    if (!ENABLE_API) return normalized;

    try {
      const { data } = await quickSlotHttp.patch("/quick-slots", {
        quickSlots: toQuickSlotMap(normalized),
      });
      const body = data.data ?? data;
      const updated = normalizeQuickSlots(body?.quickSlots);
      writeLocalSlots(updated);
      return updated;
    } catch {
      return normalized;
    }
  },
};
