"use client";

import { useEffect, useRef } from "react";

const TARGET_SAMPLE_RATE = 16000;

/** Preserve the existing 16 kHz mono PCM16 input to speech recognition. */
export function resampleToPcm16(input: Float32Array, inputSampleRate: number): ArrayBuffer {
  const ratio = inputSampleRate / TARGET_SAMPLE_RATE;
  const output = new DataView(new ArrayBuffer(Math.max(1, Math.round(input.length / ratio)) * 2));
  for (let i = 0; i < output.byteLength / 2; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.max(start + 1, Math.floor((i + 1) * ratio)));
    let sum = 0;
    for (let j = start; j < end; j++) sum += input[j];
    const sample = Math.max(-1, Math.min(1, sum / Math.max(1, end - start)));
    output.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return output.buffer as ArrayBuffer;
}

/** AI input remains separate from SFU media. Results arrive on audio_translation. */
export function useSpeechToText(stream: MediaStream | null, sendAudio: (audio: ArrayBuffer) => void) {
  const sendRef = useRef(sendAudio);
  useEffect(() => { sendRef.current = sendAudio; }, [sendAudio]);
  useEffect(() => {
    if (!stream) return;
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const processor = context.createScriptProcessor(4096, 1, 1);
    const silence = context.createGain();
    silence.gain.value = 0;
    source.connect(processor);
    processor.connect(silence);
    silence.connect(context.destination);
    void context.resume().catch(() => {});
    processor.onaudioprocess = (event) => {
      sendRef.current(resampleToPcm16(event.inputBuffer.getChannelData(0), context.sampleRate));
    };
    return () => {
      processor.onaudioprocess = null;
      source.disconnect();
      processor.disconnect();
      silence.disconnect();
      void context.close().catch(() => {});
    };
  }, [stream]);
}
