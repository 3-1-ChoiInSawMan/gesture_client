"use client";

import { useEffect, useRef } from "react";

interface StreamVideoProps {
  stream: MediaStream;
  className?: string;
  mirrored?: boolean;
}

export default function StreamVideo({
  stream,
  className = "",
  mirrored = false,
}: StreamVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className={className}
      style={mirrored ? { transform: "scaleX(-1)" } : undefined}
    />
  );
}
