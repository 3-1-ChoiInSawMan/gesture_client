import { api } from "./axiosInstance";

export interface ApiCallRoom {
  roomIdx: number;
  title: string;
  description?: string;
  category: string | null;
  thumbnailUrl?: string;
  isPublic?: boolean;
  hasPassword?: boolean;
  host?: {
    userIdx: number;
    userName: string;
    profileUrl?: string | null;
  };
  currentParticipant: number;
  maxParticipant: number;
  createdAt?: string;
}

export interface CreateRoomRequest {
  title: string;
  description: string;
  maxParticipant: number;
  isPublic: boolean;
  category: "BASIC" | "MEETING" | "STUDY";
  password?: string;
  thumbnailUrl?: string;
}

export interface CreateRoomResponse {
  roomId?: number;
  roomIdx?: number;
}

export interface EndMinutesSummary {
  minutesId: number;
  endedAt: string;
  summary: {
    title: string;
    summary: string;
    decisions: string[];
    todos: string[];
  };
}

export interface RoomsPage {
  rooms: ApiCallRoom[];
  totalPages: number;
  totalElements: number;
  pageNumber: number;
}

function parseRoomsPage(data: unknown): RoomsPage {
  const body = (data as Record<string, unknown>)?.data ?? data;
  const nested = body as Record<string, unknown>;
  const roomsObj = nested?.rooms as Record<string, unknown> | undefined;

  if (roomsObj?.content && Array.isArray(roomsObj.content)) {
    return {
      rooms: roomsObj.content as ApiCallRoom[],
      totalPages: (roomsObj.totalPages as number) ?? 1,
      totalElements: (roomsObj.totalElements as number) ?? 0,
      pageNumber: (roomsObj.number as number) ?? 0,
    };
  }

  const list = nested?.content ?? nested?.callRooms ?? nested?.rooms ?? body;
  const arr = Array.isArray(list) ? (list as ApiCallRoom[]) : [];
  return { rooms: arr, totalPages: 1, totalElements: arr.length, pageNumber: 0 };
}

export const callRoomApi = {
  leaveCall: async (roomId: string | number): Promise<void> => {
    await api.delete(`/calls/${roomId}/leave`);
  },

  getRooms: async (params?: {
    page?: number;
    size?: number;
    sort?: string;
  }): Promise<RoomsPage> => {
    const { data } = await api.get("/call-rooms", { params });
    return parseRoomsPage(data);
  },

  getRoom: async (roomId: string | number): Promise<ApiCallRoom> => {
    const { data } = await api.get(`/call-rooms/${roomId}`);
    return (data.data ?? data) as ApiCallRoom;
  },

  createRoom: async (body: CreateRoomRequest): Promise<CreateRoomResponse> => {
    const payload: Record<string, unknown> = {
      title: body.title,
      description: body.description,
      maxParticipant: body.maxParticipant,
      isPublic: body.isPublic,
      category: body.category,
    };
    if (!body.isPublic && body.password) payload.password = body.password;
    if (body.thumbnailUrl) payload.thumbnailUrl = body.thumbnailUrl;
    const { data } = await api.post("/call-rooms", payload);
    const room = data?.data?.room ?? data?.data ?? data;
    const roomId = room?.roomId ?? room?.roomIdx ?? room?.id;
    return { roomId } as CreateRoomResponse;
  },

  joinRoom: async (
    roomId: string | number,
    password?: string
  ): Promise<void> => {
    try {
      const { data } = await api.post(
        `/call-rooms/${roomId}/join`,
        password ? { password } : undefined
      );
      const isFailure =
        data?.success === false || String(data?.success) === "false";
      if (!isFailure) return;

      if (data?.statusCode === "ROOM_003") return;
      const message: string = data?.message ?? "통화방 참여에 실패했습니다.";
      throw Object.assign(new Error(message), {
        response: { status: 400, data: { message } },
      });
    } catch (error) {
      const statusCode = (
        error as { response?: { data?: { statusCode?: string } } }
      )?.response?.data?.statusCode;
      if (statusCode === "ROOM_003") return;
      throw error;
    }
  },

  updateRoom: async (
    roomId: string | number,
    body: Partial<CreateRoomRequest>
  ): Promise<void> => {
    await api.patch(`/call-rooms/${roomId}`, body);
  },

  leaveRoom: async (roomId: string | number): Promise<void> => {
    await api.delete(`/call-rooms/${roomId}/leave`);
  },

  deleteRoom: async (roomId: string | number): Promise<void> => {
    await api.delete(`/call-rooms/${roomId}`);
  },

  searchRooms: async (keyword: string): Promise<ApiCallRoom[]> => {
    const { data } = await api.get("/call-rooms", { params: { keyword } });
    return parseRoomsPage(data).rooms;
  },
};
