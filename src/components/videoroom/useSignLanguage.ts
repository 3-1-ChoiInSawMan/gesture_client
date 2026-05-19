"use client";

import { useEffect, useRef, useState } from "react";

interface SignFrame {
  left_hand: [number, number][] | null;
  right_hand: [number, number][] | null;
  left_shoulder: [number, number];
  right_shoulder: [number, number];
}

type Landmark = { x: number; y: number; z: number; visibility?: number };

const WS_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "ws://localhost:8000/ws/sltt";

const MEDIAPIPE_VERSION = "0.5.1675471629";

export function useSignLanguage(
  stream: MediaStream | null,
  enabled: boolean
): { transcript: string; isDetecting: boolean } {
  const [transcript, setTranscript] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);

  const holisticRef = useRef<{ send: (i: { image: HTMLVideoElement }) => Promise<void>; onResults: (cb: (r: any) => void) => void; setOptions: (o: object) => void; close?: () => void } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const rafRef = useRef<number | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    if (!enabled || !stream) return;

    let destroyed = false;

    const init = async () => {
      // SSR 안전한 dynamic import
      const { Holistic } = await import("@mediapipe/holistic");
      if (destroyed) return;

      // 숨김 video 엘리먼트 (MediaPipe 전용)
      const video = document.createElement("video");
      video.style.cssText =
        "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;pointer-events:none;";
      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;
      document.body.appendChild(video);
      videoRef.current = video;

      try {
        await video.play();
      } catch {
        return;
      }
      if (destroyed) return;

      // WebSocket
      const ws = new WebSocket(WS_URL);
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data as string);
          if (typeof data.text === "string") setTranscript(data.text);
        } catch {}
      };
      wsRef.current = ws;

      // MediaPipe Holistic 초기화 (모델 파일은 CDN)
      const holistic = new Holistic({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@${MEDIAPIPE_VERSION}/${file}`,
      });

      holistic.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        refineFaceLandmarks: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      holistic.onResults((results: {
        leftHandLandmarks?: Landmark[];
        rightHandLandmarks?: Landmark[];
        poseLandmarks?: Landmark[];
      }) => {
        processingRef.current = false;

        const handDetected =
          (results.leftHandLandmarks?.length ?? 0) > 0 ||
          (results.rightHandLandmarks?.length ?? 0) > 0;
        setIsDetecting(handDetected);

        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const extractHand = (lms?: Landmark[]): [number, number][] | null => {
          if (!lms || lms.length === 0) return null;
          return lms.map((lm) => [lm.x, lm.y]);
        };

        const pose = results.poseLandmarks;
        const frame: SignFrame = {
          left_hand: extractHand(results.leftHandLandmarks),
          right_hand: extractHand(results.rightHandLandmarks),
          left_shoulder: pose ? [pose[11].x, pose[11].y] : [0, 0],
          right_shoulder: pose ? [pose[12].x, pose[12].y] : [0, 0],
        };

        wsRef.current.send(JSON.stringify(frame));
      });

      holisticRef.current = holistic;

      // requestAnimationFrame 루프 — 이전 프레임 처리 중엔 스킵
      const tick = async () => {
        if (
          !processingRef.current &&
          videoRef.current &&
          holisticRef.current &&
          !videoRef.current.paused
        ) {
          processingRef.current = true;
          await holisticRef.current.send({ image: videoRef.current });
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    init().catch(() => {});

    return () => {
      destroyed = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      processingRef.current = false;
      holisticRef.current?.close?.();
      holisticRef.current = null;
      wsRef.current?.close();
      wsRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.remove();
        videoRef.current = null;
      }
    };
  }, [enabled, stream]);

  return { transcript, isDetecting };
}
