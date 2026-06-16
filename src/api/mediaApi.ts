import { api } from "./axiosInstance";

// 미디어 엔드포인트는 /api/v1이 아닌 /api 경로 사용
const MEDIA_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/v1\/?$/, "");

function getMediaUrl(path = ""): string {
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    return `${window.location.origin}/api/media${path}`;
  }
  return `${MEDIA_BASE}/media${path}`;
}

export const mediaApi = {
  upload: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post(getMediaUrl(), formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const body = data?.data ?? data;
    return body.mediaUrl as string;
  },

  getUrl: async (mediaUrl: string): Promise<string> => {
    const { data } = await api.get(getMediaUrl(`/${mediaUrl}`), {
      responseType: "blob",
    });
    return URL.createObjectURL(data);
  },
};
