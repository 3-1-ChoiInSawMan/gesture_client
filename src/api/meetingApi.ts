import { api } from "./axiosInstance";

export type MeetingStatus = "IN_PROGRESS" | "ENDED";

export interface MeetingMinutes {
  minutesIdx: number;
  callIdx: number;
  roomIdx: number;
  title?: string;
  meetingDate?: string;
  participants?: string[];
  content?: string | null;
  aiSummary?: string | null;
  conclusion?: Array<string | null>;
  status?: MeetingStatus;
  startedAt?: string;
  endedAt?: string | null;
}

export interface MeetingMinutesListItem {
  minutesIdx: number;
  callIdx: number;
  title: string;
  meetingDate: string;
  status: MeetingStatus;
}

export interface CreateMinutesRequest {
  title: string;
  transcript: string;
  participants: string[];
  aiSummary?: string;
  conclusion: string[];
}

export interface UpdateMinutesRequest {
  title?: string;
  content?: string;
  conclusion?: Array<string | null>;
}

const unwrap = <T>(response: { data?: T } | T): T => {
  if (
    response &&
    typeof response === "object" &&
    "data" in response &&
    (response as { data?: T }).data !== undefined
  ) {
    return (response as { data: T }).data;
  }
  return response as T;
};

export const meetingApi = {
  startMinutes: async (roomIdx: string | number): Promise<MeetingMinutes> => {
    const { data } = await api.post(`/meetings/start/rooms/${roomIdx}`, {});
    return unwrap<MeetingMinutes>(data);
  },

  endMinutes: async (minutesIdx: string | number): Promise<MeetingMinutes> => {
    const { data } = await api.post(`/meetings/${minutesIdx}/end`);
    return unwrap<MeetingMinutes>(data);
  },

  createMinutes: async (
    roomIdx: string | number,
    body: CreateMinutesRequest
  ): Promise<MeetingMinutes> => {
    const { data } = await api.post(`/meetings/rooms/${roomIdx}`, body);
    return unwrap<MeetingMinutes>(data);
  },

  getRoomMinutes: async (
    roomIdx: string | number
  ): Promise<MeetingMinutesListItem[]> => {
    const { data } = await api.get(`/meetings/rooms/${roomIdx}`);
    return unwrap<MeetingMinutesListItem[]>(data);
  },

  getMinutes: async (minutesIdx: string | number): Promise<MeetingMinutes> => {
    const { data } = await api.get(`/meetings/${minutesIdx}`);
    return unwrap<MeetingMinutes>(data);
  },

  updateMinutes: async (
    minutesIdx: string | number,
    body: UpdateMinutesRequest
  ): Promise<MeetingMinutes> => {
    const { data } = await api.patch(`/meetings/${minutesIdx}`, body);
    return unwrap<MeetingMinutes>(data);
  },
};
