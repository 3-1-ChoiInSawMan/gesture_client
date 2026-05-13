import { api } from "./axiosInstance";

export interface MinutesResponse {
  minutesId: string;
  roomId: string;
  startedAt: string;
}

export const meetingApi = {
  startMinutes: async (roomId: string): Promise<MinutesResponse> => {
    const { data } = await api.post(
      `/api/meetings/${roomId}/minutes/start`
    );
    return data.data as MinutesResponse;
  },

  endMinutes: async (roomId: string): Promise<void> => {
    await api.post(`/api/meetings/${roomId}/minutes/end`);
  },
};
