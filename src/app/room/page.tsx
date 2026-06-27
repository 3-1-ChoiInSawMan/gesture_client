"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import VideoRoom from "@/components/videoroom/VideoRoom";

export default function RoomPage() {
  const router = useRouter();
  const [roomId, setRoomId] = useState<string | null>(null);

  useEffect(() => {
    const id = sessionStorage.getItem("currentRoomId");
    if (!id) {
      router.replace("/call");
      return;
    }
    setRoomId(id);
  }, [router]);

  if (!roomId) return null;

  return <VideoRoom roomId={roomId} />;
}
