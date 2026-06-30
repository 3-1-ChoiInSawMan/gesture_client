import { api } from "./axiosInstance";

export interface ChatRoomSummary {
  chatRoomIdx: number;
  name: string;
  imageUrl: string | null;
  participantCount: number;
  createdAt: string;
  roomType?: "dm";
  targetUserIdx?: number;
}

export interface ChatRoomParticipant {
  userIdx: number;
  nickname: string;
  userId: string;
  profileImageUrl: string | null;
  lastReadMessageIdx: number | null;
}

export interface ChatRoomDetail {
  chatRoomIdx: number;
  name: string;
  imageUrl: string | null;
  participants: ChatRoomParticipant[];
  createdAt: string;
  updatedAt: string;
  roomType?: "dm";
  targetUserIdx?: number;
}

export interface CreatedChatRoom {
  chatRoomIdx: number;
  imageUrl: string | null;
  participants: Array<{ userIdx: number; nickname: string }>;
  createdAt: string;
}

export interface StoredChatMessage {
  messageIdx: number;
  sender: {
    userIdx: number;
    nickname: string;
    userId: string;
    profileImageUrl: string | null;
  };
  message: string | null;
  type: "TEXT" | "FILE";
  isDeleted: boolean;
  fileUrl: string | null;
  createdAt: string;
  deleted?: boolean;
}

export interface ChatMessagesPage {
  messages: StoredChatMessage[];
  nextCursor: number | null;
  hasNext: boolean;
}

const unwrap = <T>(value: unknown): T => {
  const envelope = value as { data?: T };
  return (envelope?.data ?? value) as T;
};

export const chatRoomApi = {
  create: async (body: {
    name: string;
    participantIds: number[];
    imageUuid?: string;
  }): Promise<CreatedChatRoom> => {
    const { data } = await api.post("/chat-rooms", body);
    return unwrap<CreatedChatRoom>(data);
  },

  getOrCreateDm: async (targetUserIdx: number): Promise<ChatRoomDetail> => {
    const { data } = await api.post("/chat-rooms/dm", { targetUserIdx });
    return unwrap<ChatRoomDetail>(data);
  },

  getRooms: async (): Promise<ChatRoomSummary[]> => {
    const { data } = await api.get("/chat-rooms");
    const rooms = unwrap<ChatRoomSummary[]>(data);
    return Array.isArray(rooms) ? rooms : [];
  },

  getRoom: async (chatRoomIdx: number): Promise<ChatRoomDetail> => {
    const { data } = await api.get(`/chat-rooms/${chatRoomIdx}`);
    return unwrap<ChatRoomDetail>(data);
  },

  getMessages: async (
    chatRoomIdx: number,
    params?: { cursor?: number; size?: number }
  ): Promise<ChatMessagesPage> => {
    const { data } = await api.get(`/chat-rooms/${chatRoomIdx}/messages`, {
      params,
    });
    const page = unwrap<ChatMessagesPage>(data);
    return {
      messages: Array.isArray(page?.messages) ? page.messages : [],
      nextCursor: page?.nextCursor ?? null,
      hasNext: page?.hasNext ?? false,
    };
  },

  sendText: async (
    chatRoomIdx: number,
    message: string
  ): Promise<StoredChatMessage> => {
    const { data } = await api.post(`/chat-rooms/${chatRoomIdx}/messages`, {
      type: "TEXT",
      message,
    });
    return unwrap<StoredChatMessage>(data);
  },

  uploadFile: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await api.post("/medias", formData);
    const body = data?.data?.file ?? data?.file ?? data?.data ?? data;
    const mediaUuid = body?.mediaUuid ?? body?.media_uuid;
    if (typeof mediaUuid !== "string" || !mediaUuid) {
      throw new Error("업로드 응답에 미디어 ID가 없습니다.");
    }
    return mediaUuid;
  },

  sendFile: async (
    chatRoomIdx: number,
    fileUuid: string
  ): Promise<StoredChatMessage> => {
    const { data } = await api.post(`/chat-rooms/${chatRoomIdx}/messages`, {
      type: "FILE",
      fileUuid,
    });
    return unwrap<StoredChatMessage>(data);
  },

  markAsRead: async (
    chatRoomIdx: number,
    lastReadMessageIdx: number
  ): Promise<void> => {
    await api.patch(`/chat-rooms/${chatRoomIdx}/read`, {
      lastReadMessageIdx,
    });
  },

  respondToInvitation: async (
    invitationIdx: number,
    accept: boolean
  ): Promise<void> => {
    await api.patch(`/chat-rooms/invitations/${invitationIdx}`, { accept });
  },
};
