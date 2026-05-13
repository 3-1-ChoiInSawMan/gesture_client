import axios from "axios";
import { getCookie, setCookie, deleteCookie } from "@/lib/cookie";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// 요청 인터셉터: accessToken 자동 첨부
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터: 401 시 자동 토큰 갱신
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const drainQueue = (err: unknown, token?: string) => {
  pendingQueue.forEach((p) => (err ? p.reject(err) : p.resolve(token!)));
  pendingQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = getCookie("refreshToken");
      if (!refreshToken) throw new Error("no refresh token");

      const { data } = await axios.get(`${BASE_URL}/api/auth/refresh`, {
        headers: { Authorization: `Bearer ${refreshToken}` },
      });

      const newAccess: string = data.data.accessToken;
      const newRefresh: string = data.data.refreshToken;

      if (typeof window !== "undefined") {
        localStorage.setItem("accessToken", newAccess);
      }
      setCookie("refreshToken", newRefresh);

      drainQueue(null, newAccess);
      original.headers.Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch (err) {
      drainQueue(err);
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        deleteCookie("refreshToken");
        window.location.href = "/auth/login";
      }
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);
