import { api } from "./axiosInstance";

export const mediaApi = {
  upload: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post("/media", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data.mediaUrl as string;
  },

  getUrl: async (mediaUrl: string): Promise<string> => {
    const { data } = await api.get(`/media/${mediaUrl}`, {
      responseType: "blob",
    });
    return URL.createObjectURL(data);
  },
};
