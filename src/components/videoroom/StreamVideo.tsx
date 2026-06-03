"use client";

import { useEffect, useRef } from "react";

interface StreamVideoProps {
  stream: MediaStream;
  className?: string;
  mirrored?: boolean;
  muted?: boolean;
}

export default function StreamVideo({
  stream,
  className = "",
  mirrored = false,
  muted = false,
}: StreamVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.srcObject = stream;
    video.muted = muted;
    video.play().catch(() => {});
  }, [stream, muted]);

  // 언마운트 시 srcObject 정리 — 마지막 프레임이 고정되는 현상 방지
  useEffect(() => {
    return () => {
      if (ref.current) ref.current.srcObject = null;
    };
  }, []);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={className}
      style={mirrored ? { transform: "scaleX(-1)" } : undefined}
    />
  );
}
