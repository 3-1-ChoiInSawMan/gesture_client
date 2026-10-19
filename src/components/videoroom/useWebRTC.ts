"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { refreshAccessToken } from "@/api/axiosInstance";
import { callRoomApi } from "@/api/callRoomApi";
import { SfuSession } from "./sfuSession";
import { resolveCallSocketOptions } from "./callSocketOptions";
import type { Participant } from "./types";

function socketOptions() {
  return resolveCallSocketOptions(window.location.origin, {
    mode: process.env.NEXT_PUBLIC_WEBRTC_CONNECTION_MODE,
    url: process.env.NEXT_PUBLIC_WEBRTC_WS_URL,
    path: process.env.NEXT_PUBLIC_WEBRTC_SOCKET_PATH,
  });
}

async function freshToken(): Promise<string> {
  const token = localStorage.getItem("accessToken");
  if (!token) throw new Error("로그인이 필요합니다.");
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (typeof payload.exp === "number" && payload.exp > Date.now() / 1000 + 60) return token;
  } catch { /* Refresh malformed or expired tokens as well. */ }
  return refreshAccessToken();
}

type Params = {
  roomId: string;
  userId: string;
  localVideoStream: MediaStream | null;
  localAudioStream: MediaStream | null;
  screenStream?: MediaStream | null;
  onCaption: (name: string, text: string) => void;
  onSpeechCaption: (name: string, text: string) => void;
};

export function useWebRTC(params: Params) {
  const { roomId, userId, localVideoStream, localAudioStream, screenStream } = params;
  const [remoteParticipants, setRemoteParticipants] = useState<Participant[]>([]);
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "error" | "closed">("connecting");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const current = useRef(params);
  const sessionRef = useRef<SfuSession | null>(null);
  const leaveRef = useRef<() => Promise<void>>(async () => {});
  const teardownRef = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => { current.current = params; });

  useEffect(() => {
    if (!userId) return;
    let disposed = false;
    let leaving = false;
    let generation = 0;
    let startup: Promise<void> | undefined;
    let joinedRest = false;
    let starting = false;
    let readinessTimer: ReturnType<typeof setTimeout> | undefined;
    let tokenTimer: ReturnType<typeof setTimeout> | undefined;
    let tokenExpiresAt = 0;
    let leaveTask: Promise<void> | undefined;
    const { url, path, transports } = socketOptions();
    const socket = io(url, { autoConnect: false, transports, path,
      // Avoid Next's trailing-slash redirect for every proxy polling GET/POST.
      addTrailingSlash: new URL(url).origin !== window.location.origin,
      auth: (callback) => {
        void freshToken().then((token) => {
          if (!disposed && !leaving) {
            try {
              const { exp } = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
              tokenExpiresAt = typeof exp === "number" ? exp * 1000 : 0;
            } catch { tokenExpiresAt = 0; }
            callback({ token });
          }
        }).catch((error: Error) => fail(error));
      },
    });
    let ownSession: SfuSession | null = null;
    const clearSession = () => {
      clearTimeout(tokenTimer);
      ownSession?.close();
      if (sessionRef.current === ownSession) sessionRef.current = null;
      ownSession = null;
    };
    const fail = (error: Error) => {
      if (disposed || leaving) return;
      generation++;
      clearTimeout(readinessTimer);
      clearSession();
      socket.disconnect();
      setConnectionState("error");
      setConnectionError(error.message || "통화에 연결하지 못했습니다.");
    };
    socket.on("connect", () => {
      clearTimeout(readinessTimer);
      readinessTimer = setTimeout(() => fail(new Error("통화 서버가 응답하지 않습니다. 잠시 후 다시 연결해 주세요.")), 15000);
    });
    socket.on("calls_ready", () => {
      clearTimeout(readinessTimer);
      if (disposed || leaving || starting || ownSession) return;
      starting = true;
      const epoch = ++generation;
      const isCurrent = () => !disposed && !leaving && generation === epoch && socket.connected;
      startup = (async () => {
        // A disconnect removes Core membership. Register again on reconnect.
        await callRoomApi.joinCall(roomId);
        joinedRest = true;
        if (!isCurrent()) return;
        const session = new SfuSession(socket, Number(roomId), {
          participants: (peers) => { if (!disposed) setRemoteParticipants(peers); },
          caption: (source, text) => {
            // Server captions have no speaker identity. Do not attribute them to me.
            if (source === "frame") current.current.onCaption("수어 번역", text);
            else current.current.onSpeechCaption("음성 번역", text);
          },
          error: fail,
          ended: (message) => fail(new Error(message)),
        });
        ownSession = session;
        sessionRef.current = session;
        session.setTrack("camera", current.current.localVideoStream?.getVideoTracks()[0] ?? null);
        session.setTrack("audio", current.current.localAudioStream?.getAudioTracks()[0] ?? null);
        session.setTrack("screen", current.current.screenStream?.getVideoTracks()[0] ?? null);
        await session.start();
        if (!isCurrent()) { session.close(); return; }
        setConnectionState("connected");
        setConnectionError(null);
        // The gateway caches the JWT on the socket. Re-authenticate before expiry.
        if (tokenExpiresAt) tokenTimer = setTimeout(() => {
          if (isCurrent()) setAttempt((value) => value + 1);
        }, Math.min(2147483647, Math.max(1000, tokenExpiresAt - Date.now() - 30000)));
      })().catch((error: Error) => { if (isCurrent()) fail(error); })
        .finally(() => { starting = false; });
    });
    socket.on("disconnect", (reason) => {
      generation++;
      starting = false;
      clearTimeout(readinessTimer);
      clearSession();
      if (disposed || leaving || reason === "io client disconnect") return;
      setConnectionState(reason === "io server disconnect" ? "error" : "connecting");
      setConnectionError(reason === "io server disconnect" ? "서버에서 통화 연결을 종료했습니다. 다시 연결해 주세요." : null);
    });
    socket.on("connect_error", (error: Error) => {
      if (!disposed && !leaving) {
        setConnectionState("error");
        setConnectionError(`통화 서버 연결 실패: ${error.message}`);
      }
    });
    socket.on("ws_error", (error: { message?: string }) => fail(new Error(error.message ?? "통화 요청에 실패했습니다.")));
    const leave = () => {
      if (leaveTask) return leaveTask;
      leaving = true;
      generation++;
      clearTimeout(readinessTimer);
      clearTimeout(tokenTimer);
      leaveTask = (async () => {
        await startup;
        let synced = false;
        try { synced = await ownSession?.leave() ?? false; } catch { /* REST fallback below. */ }
        clearSession();
        socket.disconnect();
        if (!synced && joinedRest) await callRoomApi.leaveCall(roomId);
        joinedRest = false;
        if (!disposed) setConnectionState("closed");
      })();
      return leaveTask;
    };
    leaveRef.current = leave;
    // Defer until after StrictMode's setup/cleanup probe.
    const timer = setTimeout(() => {
      setConnectionState("connecting");
      setConnectionError(null);
      setAiError(null);
      setRemoteParticipants([]);
      void teardownRef.current.then(() => { if (!disposed && !leaving) socket.connect(); });
    }, 0);
    return () => {
      disposed = true;
      clearTimeout(timer);
      clearTimeout(readinessTimer);
      clearSession();
      socket.removeAllListeners();
      socket.disconnect();
      // Wait for in-flight REST registration, then undo it before a retry starts.
      // This also covers unmounting between REST join and the socket join.
      teardownRef.current = (async () => {
        await startup;
        await leaveTask?.catch(() => {});
        if (joinedRest) await callRoomApi.leaveCall(roomId);
      })().catch((error) => console.warn("[SFU] 통화 퇴장 동기화 실패", error));
    };
  }, [roomId, userId, attempt]);

  useEffect(() => {
    const session = sessionRef.current;
    session?.setTrack("camera", localVideoStream?.getVideoTracks()[0] ?? null);
    session?.setTrack("audio", localAudioStream?.getAudioTracks()[0] ?? null);
    session?.setTrack("screen", screenStream?.getVideoTracks()[0] ?? null);
  }, [localVideoStream, localAudioStream, screenStream]);

  const sendAi = useCallback(async (source: "frame" | "audio", content: number[][] | ArrayBuffer) => {
    const session = sessionRef.current;
    if (!session) return;
    try {
      const accepted = await session.sendAi(source, content);
      if (sessionRef.current === session && accepted !== null)
        setAiError(accepted ? null : "현재 자막을 처리하지 못하고 있습니다. 잠시 후 다시 시도해 주세요.");
    } catch (error) {
      if (sessionRef.current === session) setAiError(error instanceof Error ? error.message : "자막 요청 실패");
    }
  }, []);
  const sendFrame = useCallback((frames: number[][]) => { void sendAi("frame", frames); }, [sendAi]);
  const sendAudio = useCallback((audio: ArrayBuffer) => { void sendAi("audio", audio); }, [sendAi]);
  const leaveCall = useCallback(() => leaveRef.current(), []);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { remoteParticipants, sendFrame, sendAudio, connectionState, connectionError, aiError, leaveCall, retry };
}
