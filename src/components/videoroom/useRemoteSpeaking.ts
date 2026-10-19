"use client";

import { useEffect, useMemo, useState } from "react";
import type { Participant } from "./types";

/** SFU has no speaking_on/off signaling; derive activity from received audio. */
export function useRemoteSpeaking(participants: Participant[]): Participant[] {
  const [speaking, setSpeaking] = useState<string[]>([]);
  useEffect(() => {
    const audible = participants.filter((peer) => !peer.isMuted && peer.stream?.getAudioTracks().length);
    if (!audible.length) return;
    const context = new AudioContext();
    const sources = audible.map((peer) => {
      const source = context.createMediaStreamSource(peer.stream!);
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      return { id: peer.id, source, analyser, data: new Uint8Array(analyser.fftSize) };
    });
    const resume = () => { void context.resume().catch(() => {}); };
    resume();
    window.addEventListener("pointerdown", resume);
    window.addEventListener("keydown", resume);
    const timer = setInterval(() => {
      const active = sources.filter(({ analyser, data }) => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const value of data) sum += ((value - 128) / 128) ** 2;
        return Math.sqrt(sum / data.length) > 0.02;
      }).map(({ id }) => id);
      setSpeaking((previous) => previous.length === active.length && previous.every((id, index) => id === active[index]) ? previous : active);
    }, 150);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("keydown", resume);
      sources.forEach(({ source, analyser }) => { source.disconnect(); analyser.disconnect(); });
      void context.close().catch(() => {});
    };
  }, [participants]);
  return useMemo(() => participants.map((peer) => ({ ...peer, isSpeaking: !peer.isMuted && speaking.includes(peer.id) })), [participants, speaking]);
}
