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

export interface SignupStoredData {
  email: string;
  password: string;
  id: string;
  nickname: string;
  statusMessage?: string;
}

interface AuthStore {
  user: User | null;
  signupData: SignupStoredData | null;
  setUser: (user: User) => void;
  clearUser: () => void;
  setSignupData: (data: SignupStoredData) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      signupData: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
      setSignupData: (data) => set({ signupData: data }),
    }),
    { name: "auth-storage" },
  ),
);
