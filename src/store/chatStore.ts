import { create } from "zustand";
import { ChatRoom, Message } from "@/components/friends/types";

interface ChatStore {
  rooms: ChatRoom[];
  messages: Record<string, Message[]>;
  selectedRoomId: string | null;

  setRooms: (rooms: ChatRoom[]) => void;
  addMessage: (roomId: string, message: Message) => void;
  selectRoom: (roomId: string | null) => void;
  sendMessage: (roomId: string, content: string, senderId: string, senderName: string) => void;
  createRoom: (name: string, memberIds: string[], memberNames?: string[], avatarUrl?: string) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  rooms: [],
  messages: {},
  selectedRoomId: null,

  setRooms: (rooms) => set({ rooms }),
  addMessage: (roomId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: [...(state.messages[roomId] ?? []), message],
      },
      rooms: state.rooms.map((room) =>
        room.id === roomId
          ? { ...room, lastMessage: message.content, lastMessageTime: message.time }
          : room
      ),
    })),
  selectRoom: (roomId) => set({ selectedRoomId: roomId }),

  sendMessage: (roomId, content, senderId, senderName) => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    const newMsg: Message = {
      id: Date.now().toString(),
      roomId,
      senderId,
      senderName,
      senderUsername: senderId,
      content,
      time,
      date: now.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" }),
    };
    const prev = get().messages[roomId] ?? [];
    set((state) => ({
      messages: { ...state.messages, [roomId]: [...prev, newMsg] },
      rooms: state.rooms.map((r) =>
        r.id === roomId ? { ...r, lastMessage: content, lastMessageTime: `오후 ${time}` } : r
      ),
    }));
  },

  createRoom: (name, memberIds, memberNames, avatarUrl) => {
    const newRoom: ChatRoom = {
      id: `room-${Date.now()}`,
      targetUserIdx: memberIds.length === 1 ? Number(memberIds[0]) : undefined,
      name,
      isGroup: memberIds.length > 1,
      members: memberIds.map((id, i) => ({
        id,
        nickname: memberNames?.[i] ?? id,
        username: id,
      })),
      lastMessage: "",
      lastMessageTime: "",
      avatarUrl,
    };

    const initMessages: Message[] = [];
    if (memberIds.length > 1 && memberNames) {
      const tagContent = memberIds
        .map((id, i) => `${memberNames[i]}(@${id})`)
        .join(", ");
      const now = new Date();
      const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      initMessages.push({
        id: `tag-${Date.now()}`,
        roomId: newRoom.id,
        senderId: memberIds[0],
        senderName: memberNames[0],
        senderUsername: memberIds[0],
        content: tagContent,
        time,
        date: now.toLocaleDateString("ko-KR", {
          year: "numeric", month: "long", day: "numeric", weekday: "long",
        }),
      });
    }

    set((state) => ({
      rooms: [newRoom, ...state.rooms],
      messages: { ...state.messages, [newRoom.id]: initMessages },
      selectedRoomId: newRoom.id,
    }));
  },
}));
