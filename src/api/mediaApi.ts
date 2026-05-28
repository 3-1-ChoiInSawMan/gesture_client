import { api } from "./axiosInstance";

// 미디어 엔드포인트는 /api/v1이 아닌 /api 경로 사용
const MEDIA_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/v1\/?$/, "");

export const mediaApi = {
  upload: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post(`${MEDIA_BASE}/media`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data.mediaUrl as string;
  },

  getUrl: async (mediaUrl: string): Promise<string> => {
    const { data } = await api.get(`${MEDIA_BASE}/media/${mediaUrl}`, {
      responseType: "blob",
    });
    return URL.createObjectURL(data);
  },
};
