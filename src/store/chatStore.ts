import { create } from "zustand";
import { ChatRoom, Message } from "@/components/friends/types";

interface ChatStore {
  rooms: ChatRoom[];
  messages: Record<string, Message[]>;
  selectedRoomId: string | null;

  setRooms: (rooms: ChatRoom[]) => void;
  setMessages: (roomId: string, messages: Message[]) => void;
  addMessage: (roomId: string, message: Message) => void;
  selectRoom: (roomId: string | null) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  rooms: [],
  messages: {},
  selectedRoomId: null,

  setRooms: (rooms) => set({ rooms }),
  setMessages: (roomId, messages) =>
    set((state) => {
      const latest = messages[messages.length - 1];
      return {
        messages: { ...state.messages, [roomId]: messages },
        rooms: latest
          ? state.rooms.map((room) =>
              room.id === roomId
                ? {
                    ...room,
                    lastMessage: latest.content,
                    lastMessageTime: latest.time,
                  }
                : room
            )
          : state.rooms,
      };
    }),
  addMessage: (roomId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: (state.messages[roomId] ?? []).some(
          (item) => item.id === message.id
        )
          ? state.messages[roomId]
          : [...(state.messages[roomId] ?? []), message],
      },
      rooms: state.rooms.map((room) =>
        room.id === roomId
          ? { ...room, lastMessage: message.content, lastMessageTime: message.time }
          : room
      ),
    })),
  selectRoom: (roomId) => set({ selectedRoomId: roomId }),
}));
