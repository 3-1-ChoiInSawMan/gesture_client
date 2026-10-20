"use client";

import { useEffect, useRef } from "react";

const STT_URL = process.env.NEXT_PUBLIC_STT_WS_URL || "wss://gesture.ingyuc.click/cc_stt";

export function extractTranscript(raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  try {
    const body: unknown = JSON.parse(value);
    if (typeof body === "string") return body.trim();
    if (body && typeof body === "object") {
      const data = body as Record<string, unknown>;
      const text = data.text ?? data.transcript ?? data.result;
      return typeof text === "string" ? text.trim() : "";
    }
    return "";
  } catch { return value; }
}

/** One recorder per connection: every new connection starts with a container header. */
export function startSttRecorder(stream: MediaStream, socket: WebSocket, onWindowFull?: () => void): () => void {
  const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]
    .find((type) => MediaRecorder.isTypeSupported(type));
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  let stopped = false;
  let chunks = 0;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    recorder.ondataavailable = null;
    recorder.onerror = null;
    if (recorder.state !== "inactive") recorder.stop();
    // Tracks belong to the call, not this recorder.
  };
  recorder.ondataavailable = (event) => {
    if (stopped || !event.data.size || socket.readyState !== WebSocket.OPEN) return;
    // Dropping encoded chunks can corrupt the container. Reconnect instead.
    if (socket.bufferedAmount > 1024 * 1024) {
      stop();
      socket.close(1000, "STT audio backlog");
      return;
    }
    socket.send(event.data);
    // The current AI keeps only 15 chunks. End this container before its header is evicted.
    if (onWindowFull && ++chunks === 10) {
      stop();
      onWindowFull();
    }
  };
  recorder.onerror = () => {
    console.warn("[STT] 오디오 녹음 오류");
    stop();
    socket.close(1000, "STT recorder error");
  };
  recorder.start(1000);
  return stop;
}

/** Stream encoded binary audio directly to AI, matching its MediaRecorder test client. */
export function useSpeechToText(stream: MediaStream | null, onTranscript: (text: string) => void) {
  const transcriptRef = useRef(onTranscript);
  useEffect(() => { transcriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => {
    if (!stream?.getAudioTracks().some((track) => track.readyState === "live")) return;
    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let socket: WebSocket | undefined;
    let attempts = 0;
    const sessions = new Map<WebSocket, { stop?: () => void; timer?: ReturnType<typeof setTimeout> }>();
    let generation = 0;
    let lastDisplayedGeneration = 0;
    if (typeof MediaRecorder === "undefined") {
      console.warn("[STT] 이 브라우저는 MediaRecorder를 지원하지 않습니다.");
      return;
    }
    const audioStream = new MediaStream(stream.getAudioTracks());
    const url = window.location.protocol === "https:" ? STT_URL.replace(/^ws:/, "wss:") : STT_URL;
    const connect = () => {
      if (disposed) return;
      const current = new WebSocket(url);
      const currentGeneration = ++generation;
      const recording: { stop?: () => void; timer?: ReturnType<typeof setTimeout> } = {};
      sessions.set(current, recording);
      socket = current;
      current.binaryType = "arraybuffer";
      current.onopen = () => {
        if (disposed) { current.close(); return; }
        try {
          recording.stop = startSttRecorder(audioStream, current, () => {
            if (disposed || socket !== current) return;
            // Keep receiving the old segment's final result while the next container starts.
            recording.timer = setTimeout(() => {
              current.onmessage = null;
              current.close(1000, "STT segment completed");
            }, 5000);
            connect();
          });
          attempts = 0;
        } catch {
          console.warn("[STT] 오디오 녹음을 시작할 수 없습니다.");
          current.close(1000, "STT recorder unavailable");
        }
      };
      current.onmessage = async (event: MessageEvent) => {
        const raw = event.data instanceof Blob ? await event.data.text()
          : event.data instanceof ArrayBuffer ? new TextDecoder().decode(event.data) : event.data;
        if (disposed || !sessions.has(current) || currentGeneration < lastDisplayedGeneration || typeof raw !== "string") return;
        const text = extractTranscript(raw);
        if (text) {
          lastDisplayedGeneration = currentGeneration;
          transcriptRef.current(text);
        }
      };
      current.onerror = () => {
        if (!disposed) console.warn("[STT] AI WebSocket 연결 오류");
      };
      current.onclose = () => {
        recording.stop?.();
        clearTimeout(recording.timer);
        sessions.delete(current);
        if (!disposed && socket === current) retryTimer = setTimeout(connect, Math.min(1000 * 2 ** attempts++, 30000));
      };
    };
    connect();
    return () => {
      disposed = true;
      clearTimeout(retryTimer);
      for (const [connection, recording] of sessions) {
        recording.stop?.();
        clearTimeout(recording.timer);
        connection.onmessage = null;
        connection.onerror = null;
        connection.onclose = null;
        // A connecting socket is closed by onopen once the handshake finishes.
        if (connection.readyState === WebSocket.OPEN) connection.close();
      }
      sessions.clear();
    };
  }, [stream]);
}
