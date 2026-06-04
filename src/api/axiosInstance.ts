import axios from "axios";
import { toast } from "react-toastify";
import { getCookie, setCookie, deleteCookie } from "@/lib/cookie";

// 인증 자체 엔드포인트는 토큰 갱신 로직에서 제외
const AUTH_SKIP = ["/auth/login", "/auth/register", "/auth/email-send", "/auth/email-verification", "/auth/refresh"];

// 비즈니스 도메인 엔드포인트: 401/403 에러를 토큰 만료로 오해하지 않도록 갱신 로직 스킵
// (예: 비공개 통화방 비밀번호 오류 → 403 or 401, 토큰과 무관)
const DOMAIN_SKIP = ["/call-rooms"];

// HTTPS 배포 환경에서는 Mixed Content 방지를 위해 상대경로 사용 (Vercel rewrite 경유)
// HTTP 로컬 개발에서는 NEXT_PUBLIC_API_URL 직접 사용
function resolveBaseUrl(): string {
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    return "/api/v1";
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "";
}

const BASE_URL = resolveBaseUrl();

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

// 응답 인터셉터: 401/403 시 자동 토큰 갱신
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const drainQueue = (err: unknown, token?: string) => {
  pendingQueue.forEach((p) => (err ? p.reject(err) : p.resolve(token!)));
  pendingQueue = [];
};

// 토큰 만료 여부 판단
// - 401: 표준 미인증
// - 403: 백엔드가 만료 시 403을 반환하는 경우, 메시지로 구분
const isTokenExpired = (status: number, message: string) => {
  if (status === 401) return true;
  if (status === 403) {
    const lower = message.toLowerCase();
    // 실제 권한 없음(forbidden)과 토큰 만료를 메시지로 구분
    return (
      lower.includes("token") ||
      lower.includes("expired") ||
      lower.includes("jwt") ||
      lower.includes("만료") ||
      lower.includes("unauthorized")
    );
  }
  return false;
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url = original?.url ?? "";
    const method = (original?.method ?? "").toUpperCase();
    const message = error.response?.data?.message ?? error.message ?? "Unknown error";

    // 409 Conflict: 이미 참여 중 등 — 호출자가 직접 처리, 인터셉터 개입 없음
    if (status === 409) {
      return Promise.reject(error);
    }

    console.error(`[API ${status ?? "ERR"}] ${method} ${url} →`, message, error.response?.data ?? "");

    // 인증 엔드포인트는 토큰 갱신 로직 스킵
    if (AUTH_SKIP.some((path) => url.includes(path))) {
      return Promise.reject(error);
    }

    // 비즈니스 도메인 엔드포인트: 401/403이어도 토큰 갱신 시도 없이 caller에게 넘김
    if (DOMAIN_SKIP.some((path) => url.includes(path))) {
      return Promise.reject(error);
    }

    // 토큰 만료 계열 에러가 아니면 그냥 반환
    if (!isTokenExpired(status, message)) {
      return Promise.reject(error);
    }

    // 로컬스토리지에 accessToken 자체가 없으면 → 미로그인 상태
    const hasToken =
      typeof window !== "undefined" && !!localStorage.getItem("accessToken");

    if (!hasToken) {
      toast.error("로그인이 필요합니다.");
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      }
      return Promise.reject(error);
    }

    // 이미 재시도한 요청이면 반환
    if (original._retry) {
      return Promise.reject(error);
    }

    // 다른 요청이 이미 갱신 중이면 대기열에 추가
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

      const { data } = await axios.get(`${BASE_URL}/auth/refresh`, {
        headers: { Authorization: `Bearer ${refreshToken}` },
      });

      const newAccess: string = data.data.accessToken;
      const newRefresh: string = data.data.refreshToken;

      if (typeof window !== "undefined") {
        localStorage.setItem("accessToken", newAccess);
      }
      setCookie("refreshToken", newRefresh);

      // 대기 중이던 요청들 재시도
      drainQueue(null, newAccess);

      // 원래 실패한 요청 재시도
      original.headers.Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch (err) {
      drainQueue(err);
      console.error("[Auth] 리프레시 토큰 갱신 실패:", err);
      // 리프레쉬도 실패 → 토큰 만료 처리
      toast.error("토큰이 만료되었습니다. 다시 로그인해 주세요.");
      if (typeof window !== "undefined") {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("auth-storage");
        deleteCookie("refreshToken");
        window.location.href = "/auth/login";
      }
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);
