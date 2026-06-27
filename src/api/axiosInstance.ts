import axios, { AxiosError, AxiosHeaders } from "axios";
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
type RefreshPayload = {
  accessToken?: string;
  access_token?: string;
  refreshToken?: string;
  refresh_token?: string;
  user?: RefreshPayload;
};

let refreshPromise: Promise<string> | null = null;

const isRejectedRefreshToken = (error: unknown): boolean => {
  const response = (error as AxiosError<{ statusCode?: string }>).response;
  return (
    response?.status === 401 ||
    response?.data?.statusCode === "AUTH_003" ||
    response?.data?.statusCode === "TOKEN_100"
  );
};

const readBearerToken = (authorization: unknown): string | undefined => {
  if (typeof authorization !== "string") return undefined;
  return authorization.replace(/^Bearer\s+/i, "").trim() || undefined;
};

export const refreshAccessToken = (): Promise<string> => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getCookie("refreshToken");
    if (!refreshToken) throw new Error("no refresh token");

    const response = await axios.post(
      `${BASE_URL}/auth/refresh`,
      { refresh_token: refreshToken },
      { headers: { "Content-Type": "application/json" } }
    );
    const envelope = response.data as { data?: RefreshPayload } & RefreshPayload;
    const payload = envelope.data ?? envelope;
    const accessToken =
      payload.accessToken ??
      payload.access_token ??
      payload.user?.accessToken ??
      payload.user?.access_token ??
      readBearerToken(response.headers.authorization) ??
      (typeof response.headers["x-access-token"] === "string"
        ? response.headers["x-access-token"]
        : undefined);
    const rotatedRefreshToken =
      payload.refreshToken ??
      payload.refresh_token ??
      payload.user?.refreshToken ??
      payload.user?.refresh_token ??
      (typeof response.headers["x-refresh-token"] === "string"
        ? response.headers["x-refresh-token"]
        : undefined);

    if (!accessToken) {
      throw new Error("refresh response did not include an access token");
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("accessToken", accessToken);
    }
    if (rotatedRefreshToken) {
      setCookie("refreshToken", rotatedRefreshToken);
    }

    return accessToken;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

// 토큰 만료 여부 판단
// statusCode가 있으면 우선 체크 — 비즈니스 에러(USER_XXX, ROOM_XXX 등)는 토큰 만료 아님
// statusCode가 없거나 AUTH 계열일 때만 status/message로 판단
const isTokenExpired = (status: number, message: string, statusCode?: string) => {
  // 비즈니스 에러 코드가 있으면 토큰 만료 아님
  if (statusCode && !statusCode.startsWith("AUTH_") && statusCode !== "SC_000") {
    return false;
  }
  if (status === 401) return true;
  if (status === 403) {
    const lower = message.toLowerCase();
    return (
      lower.includes("token") ||
      lower.includes("expired") ||
      lower.includes("jwt") ||
      lower.includes("만료")
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
    const statusCode: string | undefined = error.response?.data?.statusCode;
    if (!isTokenExpired(status, message, statusCode)) {
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
    if (!original || original._retry) {
      return Promise.reject(error);
    }

    // 다른 요청이 이미 갱신 중이면 대기열에 추가
    original._retry = true;

    try {
      const newAccess = await refreshAccessToken();

      // 대기 중이던 요청들 재시도
      original.headers = AxiosHeaders.from(original.headers);

      // 원래 실패한 요청 재시도
      original.headers.set("Authorization", `Bearer ${newAccess}`);
      return api(original);
    } catch (err) {
      console.error("[Auth] 리프레시 토큰 갱신 실패:", err);
      // 네트워크 장애로 사용자를 로그아웃시키지 않고, refresh token이
      // 실제로 거부된 경우에만 세션을 종료한다.
      if (isRejectedRefreshToken(err) && typeof window !== "undefined") {
        toast.error("세션이 만료되었습니다. 다시 로그인해 주세요.");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("auth-storage");
        deleteCookie("refreshToken");
        window.location.href = "/auth/login";
      }
      return Promise.reject(err);
    }
  }
);
