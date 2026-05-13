import { io, Socket } from "socket.io-client";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "";

// ── Caption Socket (/api/ws/caption) ──────────────────────────

export interface CaptionPayload {
  user_id: string;
  caption: string;
}

let captionSocket: Socket | null = null;

export function getCaptionSocket(): Socket {
  if (!captionSocket) {
    captionSocket = io(`${WS_URL}/api/ws/caption`, {
      transports: ["websocket"],
      autoConnect: false,
    });
  }
  return captionSocket;
}

export function joinCaptionRoom(callRoomId: string) {
  getCaptionSocket().emit("join_room", { call_room_id: callRoomId });
}

export function onBroadcastCaption(
  cb: (payload: CaptionPayload) => void
): () => void {
  const socket = getCaptionSocket();
  socket.on("broadcast_cast_caption", cb);
  return () => socket.off("broadcast_cast_caption", cb);
}

export function disconnectCaptionSocket() {
  captionSocket?.disconnect();
  captionSocket = null;
}

// ── Chat Socket (/api/ws/chat) ─────────────────────────────────

export interface ChatMessage {
  user_id: string;
  content: string;
  created_at: string;
}

export interface ChatFile {
  user_id: string;
  file_url: string;
  file_name: string;
  created_at: string;
}

export interface ChatError {
  code: number;
  message: string;
}

let chatSocket: Socket | null = null;

export function getChatSocket(): Socket {
  if (!chatSocket) {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null;
    chatSocket = io(`${WS_URL}/api/ws/chat`, {
      transports: ["websocket"],
      autoConnect: false,
      auth: token ? { token } : undefined,
    });
  }
  return chatSocket;
}

export function joinChatRoom(callRoomId: string) {
  getChatSocket().emit("join_room", { call_room_id: callRoomId });
}

export function leaveChatRoom(callRoomId: string) {
  getChatSocket().emit("leave_room", { call_room_id: callRoomId });
}

export function sendChatMessage(callRoomId: string, content: string) {
  getChatSocket().emit("send_message", { call_room_id: callRoomId, content });
}

export function uploadChatFile(
  callRoomId: string,
  fileUrl: string,
  fileName: string
) {
  getChatSocket().emit("upload_file", {
    call_room_id: callRoomId,
    file_url: fileUrl,
    file_name: fileName,
  });
}

export function sendNotification(type: string, userId: string) {
  getChatSocket().emit("send_notification", { type, user_id: userId });
}

export function onReceiveMessage(cb: (msg: ChatMessage) => void): () => void {
  const socket = getChatSocket();
  socket.on("receive_message", cb);
  return () => socket.off("receive_message", cb);
}

export function onReceiveFile(cb: (file: ChatFile) => void): () => void {
  const socket = getChatSocket();
  socket.on("receive_file", cb);
  return () => socket.off("receive_file", cb);
}

export function onChatError(cb: (err: ChatError) => void): () => void {
  const socket = getChatSocket();
  socket.on("error", cb);
  return () => socket.off("error", cb);
}

export function onUserJoined(cb: (payload: { user_id: string }) => void): () => void {
  const socket = getChatSocket();
  socket.on("broadcast_join_room", cb);
  return () => socket.off("broadcast_join_room", cb);
}

export function onUserLeft(cb: (payload: { user_id: string }) => void): () => void {
  const socket = getChatSocket();
  socket.on("broadcast_leave_room", cb);
  return () => socket.off("broadcast_leave_room", cb);
}

export function disconnectChatSocket() {
  chatSocket?.disconnect();
  chatSocket = null;
}
