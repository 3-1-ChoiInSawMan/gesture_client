import { create } from "zustand";
import { ChatRoom, Message } from "@/components/friends/types";

interface ChatStore {
  rooms: ChatRoom[];
  messages: Record<string, Message[]>;
  selectedRoomId: string | null;

  setRooms: (rooms: ChatRoom[]) => void;
  setMessages: (roomId: string, messages: Message[]) => void;
  mergeMessages: (roomId: string, messages: Message[]) => void;
  addMessage: (roomId: string, message: Message) => void;
  selectRoom: (roomId: string | null) => void;
}

const updateRoomPreview = (rooms: ChatRoom[], roomId: string, messages: Message[]) => {
  const latest = messages[messages.length - 1];
  if (!latest) return rooms;
  return rooms.map((room) =>
    room.id === roomId
      ? {
          ...room,
          lastMessage: latest.type === "FILE" ? "파일" : latest.content,
          lastMessageTime: latest.time,
        }
      : room
  );
};

const mergeById = (current: Message[], incoming: Message[]) => {
  const merged = new Map(current.map((message) => [message.id, message]));
  incoming.forEach((message) => merged.set(message.id, message));
  return [...merged.values()].sort((a, b) => Number(a.id) - Number(b.id));
};

export const useChatStore = create<ChatStore>((set) => ({
  rooms: [],
  messages: {},
  selectedRoomId: null,

  setRooms: (rooms) =>
    set((state) => ({
      rooms,
      selectedRoomId:
        state.selectedRoomId &&
        rooms.some((room) => room.id === state.selectedRoomId)
          ? state.selectedRoomId
          : null,
    })),
  setMessages: (roomId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [roomId]: messages },
      rooms: updateRoomPreview(state.rooms, roomId, messages),
    })),
  mergeMessages: (roomId, messages) =>
    set((state) => {
      const merged = mergeById(state.messages[roomId] ?? [], messages);
      return {
        messages: { ...state.messages, [roomId]: merged },
        rooms: updateRoomPreview(state.rooms, roomId, merged),
      };
    }),
  addMessage: (roomId, message) =>
    set((state) => {
      const merged = mergeById(state.messages[roomId] ?? [], [message]);
      return {
        messages: { ...state.messages, [roomId]: merged },
        rooms: updateRoomPreview(state.rooms, roomId, merged),
      };
    }),
  selectRoom: (roomId) => set({ selectedRoomId: roomId }),
}));
