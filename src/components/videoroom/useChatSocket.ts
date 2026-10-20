"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import { ChatMessage, Participant } from "./types";
import { createSpeechCaptionReceiver, encodeSpeechCaption } from "./speechCaptionRelay";
import { resolveChatSocketOptions } from "./callSocketOptions";
import { getValidAccessToken, refreshAccessToken } from "@/api/axiosInstance";

function getWsOrigin(): string {
  return window.location.origin;
}

export function useChatSocket(
  roomId: string,
  participants: Participant[],
  onMessage: (msg: ChatMessage) => void,
  onSpeechCaption?: (name: string, text: string) => void
) {
  const socketRef = useRef<Socket | null>(null);
  const readyRef = useRef(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const onMessageRef = useRef(onMessage);
  const participantsRef = useRef(participants);
  const speechCaptionRef = useRef(onSpeechCaption);
  useEffect(() => { speechCaptionRef.current = onSpeechCaption; }, [onSpeechCaption]);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  useEffect(() => {
    if (!roomId) return;
    let disposed = false;
    const receiveCaption = createSpeechCaptionReceiver();

    const options = resolveChatSocketOptions(getWsOrigin(), {
      mode: process.env.NEXT_PUBLIC_WEBRTC_CONNECTION_MODE,
      url: process.env.NEXT_PUBLIC_WEBRTC_WS_URL,
      path: process.env.NEXT_PUBLIC_WEBRTC_SOCKET_PATH,
    });
    let joinTimer: ReturnType<typeof setTimeout>;
    let retryTimer: ReturnType<typeof setTimeout>;
    let retries = 0;
    const socket = io(options.url, {
      autoConnect: false,
      forceNew: true,
      path: options.path,
      addTrailingSlash: options.addTrailingSlash,
      transports: options.transports,
      auth: (done) => {
        void getValidAccessToken().then(token => {
          if (!disposed && token) done({ token });
          else if (!disposed) setConnectionError("채팅 연결에 로그인이 필요합니다.");
        }).catch(() => { if (!disposed) setConnectionError("채팅 인증에 실패했습니다."); });
      },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      if (disposed) {
        socket.disconnect();
        return;
      }
      // This gateway has no readiness event/ACK; allow its async authentication to finish.
      clearTimeout(joinTimer);
      joinTimer = setTimeout(() => {
        if (disposed || !socket.connected) return;
        socket.emit("join_chat", { roomType: "call", targetIdx: Number(roomId) });
        readyRef.current = true;
        setConnectionError(null);
      }, 300);
    });
    socket.on("connect_error", () => {
      readyRef.current = false;
      if (!disposed) setConnectionError("채팅·음성 자막 공유 연결을 재시도하고 있습니다.");
    });
    socket.on("ws_error", (error: { statusCode?: string; message?: string }) => {
      readyRef.current = false;
      if (!disposed) setConnectionError(error.message || "채팅 서버에서 요청을 거절했습니다.");
      if (error.statusCode === "AUTH_002") void refreshAccessToken().catch(() => {});
    });
    socket.on("disconnect", (reason) => {
      readyRef.current = false;
      clearTimeout(joinTimer);
      if (disposed) return;
      setConnectionError("채팅 연결이 끊겨 메시지와 음성 자막을 공유할 수 없습니다.");
      if (reason === "io server disconnect" && retries++ < 3)
        retryTimer = setTimeout(() => { if (!disposed) socket.connect(); }, 1000 * retries);
    });

    socket.on(
      "receive_message",
      (data: {
        roomType?: string;
        targetIdx?: number;
        message?: string;
        content?: string;
        created_at?: string;
        createdAt?: string;
        fromUserIdx?: number;
        fromSocketId?: string;
        user_id?: string;
      }) => {
        if (disposed || data.roomType !== "call" || String(data.targetIdx) !== String(roomId)) return;

        const createdAt = data.created_at ?? data.createdAt;
        const time = createdAt
          ? new Date(createdAt).toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          })
          : new Date().toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
          });
        const participant = participantsRef.current.find(
          (item) => item.userIdx === data.fromUserIdx
        );
        const fallbackId = data.fromUserIdx ? String(data.fromUserIdx) : data.user_id ?? "unknown";
        const message = data.message ?? data.content ?? "";
        if (typeof message !== "string") return;
        const caption = receiveCaption(message, data.fromUserIdx ?? -1);
        if (caption.handled) {
          if (caption.text && Number.isInteger(data.fromUserIdx))
            speechCaptionRef.current?.(participant?.name ?? `User ${fallbackId}`, caption.text);
          return;
        }

        onMessageRef.current({
          id: `${Date.now()}-${Math.random()}`,
          participantId: participant?.id ?? data.fromSocketId ?? fallbackId,
          name: participant?.name ?? `User ${fallbackId}`,
          username: participant?.username ?? fallbackId,
          message,
          time,
        });
      }
    );

    socket.connect();
    return () => {
      disposed = true;
      readyRef.current = false;
      clearTimeout(joinTimer);
      clearTimeout(retryTimer);
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId]);

  const sendMessage = useCallback(
    (message: string) => {
      if (!socketRef.current?.connected || !readyRef.current || message.length > 1000) return false;
      socketRef.current.emit("send_message", {
        roomType: "call",
        targetIdx: Number(roomId),
        message,
      });
      return true;
    },
    [roomId]
  );

  const sendSpeechCaption = useCallback((text: string) => {
    const socket = socketRef.current;
    // Never replay old captions after reconnecting or entering a different room.
    if (!socket?.connected || !readyRef.current) return false;
    for (const message of encodeSpeechCaption(text, crypto.randomUUID())) {
      socket.emit("send_message", { roomType: "call", targetIdx: Number(roomId), message });
    }
    return true;
  }, [roomId]);

  return { sendMessage, sendSpeechCaption, connectionError };
}
