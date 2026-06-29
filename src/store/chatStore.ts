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
}));
