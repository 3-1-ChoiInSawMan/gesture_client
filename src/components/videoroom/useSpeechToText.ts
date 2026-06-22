"use client";

import { useEffect, useRef } from "react";

const RAW_STT_URL =
  process.env.NEXT_PUBLIC_STT_WS_URL ?? "ws://ingyuc.click/cc_stt";
const TARGET_SAMPLE_RATE = 16000;

function getSttUrl(): string {
  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    RAW_STT_URL.startsWith("ws://")
  ) {
    return RAW_STT_URL.replace(/^ws:\/\//, "wss://");
  }
  return RAW_STT_URL;
}

function resampleToPcm16(
  input: Float32Array,
  inputSampleRate: number
): ArrayBuffer {
  const ratio = inputSampleRate / TARGET_SAMPLE_RATE;
  const outputLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Int16Array(outputLength);

  for (let i = 0; i < outputLength; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    const count = Math.max(1, end - start);
    for (let j = start; j < end; j += 1) sum += input[j];
    const sample = Math.max(-1, Math.min(1, sum / count));
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  return output.buffer;
}

function extractTranscript(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (typeof parsed === "string") return parsed.trim();
      if (parsed && typeof parsed === "object") {
        const body = parsed as Record<string, unknown>;
        const text = body.text ?? body.transcript ?? body.result;
        return typeof text === "string" ? text.trim() : "";
      }
    } catch {
      return trimmed;
    }
    return "";
  }
  return "";
}

export function useSpeechToText(
  stream: MediaStream | null,
  onTranscript?: (text: string) => void
) {
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    if (!stream) return;
    let disposed = false;

    const socket = new WebSocket(getSttUrl());
    socket.binaryType = "arraybuffer";

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(4096, 1, 1);
    const silentGain = audioContext.createGain();
    silentGain.gain.value = 0;

    source.connect(processor);
    processor.connect(silentGain);
    silentGain.connect(audioContext.destination);

    processor.onaudioprocess = (event) => {
      if (socket.readyState !== WebSocket.OPEN) return;
      const samples = event.inputBuffer.getChannelData(0);
      socket.send(resampleToPcm16(samples, audioContext.sampleRate));
    };

    socket.onopen = () => {
      if (disposed) socket.close();
    };

    socket.onmessage = async (event) => {
      const raw =
        event.data instanceof Blob
          ? await event.data.text()
          : event.data instanceof ArrayBuffer
            ? new TextDecoder().decode(event.data)
            : event.data;
      const transcript = extractTranscript(raw);
      if (transcript) onTranscriptRef.current?.(transcript);
    };

    return () => {
      disposed = true;
      processor.onaudioprocess = null;
      socket.onmessage = null;
      source.disconnect();
      processor.disconnect();
      silentGain.disconnect();
      audioContext.close().catch(() => {});
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [stream]);
}
