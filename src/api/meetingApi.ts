import { api } from "./axiosInstance";

export interface StartMinutesResponse {
  minutesId: number;
  startedAt: string;
}

export interface EndMinutesResponse {
  minutesId: number;
  endedAt: string;
  summary: {
    title: string;
    summary: string;
    decisions: string[];
    todos: string[];
  };
}

export const meetingApi = {
  startMinutes: async (roomId: string | number): Promise<StartMinutesResponse> => {
    const { data } = await api.post(`/api/meetings/${roomId}/minutes/start`);
    return data.data as StartMinutesResponse;
  },

  endMinutes: async (roomId: string | number): Promise<EndMinutesResponse> => {
    const { data } = await api.get(`/api/meetings/${roomId}/minutes/end`);
    return data.data as EndMinutesResponse;
  },
};
