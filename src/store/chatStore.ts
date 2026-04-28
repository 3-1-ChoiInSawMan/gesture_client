import { create } from "zustand";
import { ChatRoom, Message } from "@/components/friends/types";
import { MOCK_ROOMS, MOCK_MESSAGES } from "@/components/friends/mockData";
import { chatSocket } from "@/lib/socket";

interface ChatStore {
  rooms: ChatRoom[];
  messages: Record<string, Message[]>;
  selectedRoomId: string | null;

  selectRoom: (roomId: string | null) => void;
  sendMessage: (roomId: string, content: string, senderId: string, senderName: string) => void;
  receiveMessage: (message: Message) => void;
  createRoom: (name: string, memberIds: string[], memberNames?: string[], avatarUrl?: string) => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  rooms: MOCK_ROOMS,
  messages: MOCK_MESSAGES,
  selectedRoomId: null,

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
    chatSocket.send({
      type: "message",
      id: newMsg.id,
      roomId,
      senderId,
      senderName,
      senderUsername: senderId,
      content,
      time,
    });
  },

  receiveMessage: (message) => {
    const prev = get().messages[message.roomId] ?? [];
    if (prev.some((m) => m.id === message.id)) return;
    set((state) => ({
      messages: { ...state.messages, [message.roomId]: [...prev, message] },
      rooms: state.rooms.map((r) =>
        r.id === message.roomId
          ? { ...r, lastMessage: message.content, lastMessageTime: `오후 ${message.time}` }
          : r
      ),
    }));
  },

  createRoom: (name, memberIds, memberNames, avatarUrl) => {
    const newRoom: ChatRoom = {
      id: `room-${Date.now()}`,
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
