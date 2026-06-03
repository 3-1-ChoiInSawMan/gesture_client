"use client";

import { useEffect, useRef, useState } from "react";

type Landmark = { x: number; y: number; z: number; visibility?: number };

/** 손 미감지 시 채울 플레이스홀더 (21 랜드마크 × 2 = 42개) */
const MISSING_HAND = new Array(42).fill(0);
/** 한 번에 전송할 프레임 수 */
const FRAME_BUFFER_SIZE = 30;

function flattenHand(lms?: Landmark[]): number[] {
  if (!lms || lms.length === 0) return MISSING_HAND;
  return lms.flatMap((lm) => [lm.x, lm.y]);
}

const MEDIAPIPE_VERSION = "0.5.1675471629";

export function useSignLanguage(
  stream: MediaStream | null,
  enabled: boolean,
  onBatch?: (frames: number[][]) => void
): { isDetecting: boolean; isLoading: boolean } {
  const [isDetecting, setIsDetecting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const holisticRef = useRef<{ send: (i: { image: HTMLVideoElement }) => Promise<void>; onResults: (cb: (r: any) => void) => void; setOptions: (o: object) => void; initialize?: () => Promise<void>; close?: () => void } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const keypointBufferRef = useRef<number[][]>([]);
  const rafRef = useRef<number | null>(null);
  const processingRef = useRef(false);
  const onBatchRef = useRef(onBatch);
  onBatchRef.current = onBatch;

  useEffect(() => {
    if (!enabled || !stream) return;

    let destroyed = false;

    const init = async () => {
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

      // MediaPipe Holistic 초기화
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

        const pose = results.poseLandmarks;
        const frameKP: number[] = [
          ...flattenHand(results.leftHandLandmarks),
          ...flattenHand(results.rightHandLandmarks),
          ...(pose
            ? [pose[11].x, pose[11].y, pose[12].x, pose[12].y]
            : [0, 0, 0, 0]),
        ];
        keypointBufferRef.current.push(frameKP);

        if (keypointBufferRef.current.length >= FRAME_BUFFER_SIZE) {
          const batch = keypointBufferRef.current.splice(0, FRAME_BUFFER_SIZE);
          onBatchRef.current?.(batch);
        }
      });

      holisticRef.current = holistic;

      // 모델 파일 CDN 다운로드 (첫 실행 시 수십 초 소요될 수 있음)
      setIsLoading(true);
      try {
        if (holistic.initialize) await holistic.initialize();
      } catch {
        // initialize() 미지원 시 무시 — 첫 send() 호출 때 자동 로드
      }
      if (destroyed) return;
      setIsLoading(false);

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
      keypointBufferRef.current = [];
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.remove();
        videoRef.current = null;
      }
      setIsLoading(false);
      setIsDetecting(false);
    };
  }, [enabled, stream]);

  return { isDetecting, isLoading };
}
