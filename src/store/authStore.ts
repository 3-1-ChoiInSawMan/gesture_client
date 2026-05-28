import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: string;
  nickname: string;
  email: string;
  profileImage?: string;
  statusMessage?: string;
  joinedAt: string;
  stats: {
    totalCalls: number;
    friends: number;
    rooms: number;
  };
}

interface AuthStore {
  user: User | null;
  _hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setUser: (user: User) => void;
  clearUser: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      _hasHydrated: false,
      setHasHydrated: (value) => set({ _hasHydrated: value }),
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    {
      name: "auth-storage",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
