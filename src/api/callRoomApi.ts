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

export interface CallParticipant {
  userIdx: number;
  nickname: string;
  joinedAt?: string;
  isHost?: boolean;
  host?: boolean;
}

export interface CallParticipantsResponse {
  callIdx: number;
  roomIdx: number;
  participants: CallParticipant[];
  currentParticipant: number;
}

function getStatusCode(error: unknown): string {
  return String(
    (error as { response?: { data?: { statusCode?: string; code?: string } } })
      ?.response?.data?.statusCode ??
      (error as { response?: { data?: { code?: string } } })?.response?.data?.code ??
      ""
  );
}

function getCurrentUserIdx(): number | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("accessToken");
  const encodedPayload = token?.split(".")[1];
  if (!encodedPayload) return null;

  try {
    const normalized = encodedPayload.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(normalized)) as { idx?: number };
    return Number.isInteger(payload.idx) ? Number(payload.idx) : null;
  } catch {
    return null;
  }
}

async function isJoinedToCallRoom(roomId: string | number): Promise<boolean> {
  const userIdx = getCurrentUserIdx();
  if (!userIdx) return false;

  try {
    const { data } = await api.get(`/calls/${roomId}/participants`);
    const body = data?.data?.call ?? data?.data ?? data;
    return (
      Array.isArray(body?.participants) &&
      body.participants.some(
        (participant: { userIdx?: number }) => participant.userIdx === userIdx
      )
    );
  } catch {
    return false;
  }
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
  joinCall: async (roomId: string | number): Promise<void> => {
    try {
      await api.post(`/calls/${roomId}/join`);
    } catch (error) {
      if (
        getStatusCode(error) === "CALL_004" &&
        (await isJoinedToCallRoom(roomId))
      ) {
        return;
      }
      throw error;
    }
  },

  leaveCall: async (roomId: string | number): Promise<void> => {
    await api.delete(`/calls/${roomId}/leave`);
  },

  getCallParticipants: async (
    roomId: string | number
  ): Promise<CallParticipantsResponse> => {
    const { data, status } = await api.get(`/calls/${roomId}/participants`, {
      validateStatus: (responseStatus) =>
        (responseStatus >= 200 && responseStatus < 300) || responseStatus === 404,
    });
    if (status === 404) {
      return {
        callIdx: 0,
        roomIdx: Number(roomId),
        participants: [],
        currentParticipant: 0,
      };
    }
    const body = data?.data?.call ?? data?.data ?? data;
    return {
      callIdx: body?.callIdx ?? 0,
      roomIdx: body?.roomIdx ?? Number(roomId),
      participants: Array.isArray(body?.participants) ? body.participants : [],
      currentParticipant: body?.currentParticipant ?? 0,
    };
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
    const { data } = await api.post(
      `/call-rooms/${roomId}/join`,
      password ? { password } : undefined
    );
    // 서버가 HTTP 200으로 실패를 반환하는 경우 처리 (success: false)
    const isFailure = data?.success === false || String(data?.success) === "false";
    if (isFailure) {
      const statusCode: string = data?.statusCode ?? "";
      // ROOM_003: 이미 참여 중 → 정상 입장 처리
      if (statusCode === "ROOM_003") return;
      // 그 외 실패 (비밀번호 오류 등) → 에러로 변환
      const message: string = data?.message ?? "통화방 참여에 실패했습니다.";
      const err = Object.assign(new Error(message), {
        response: { status: 400, data: { message } },
      });
      throw err;
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
