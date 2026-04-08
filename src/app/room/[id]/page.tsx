"use client";

import { useParams } from "next/navigation";
import VideoRoom from "@/components/videoroom/VideoRoom";

export default function RoomPage() {
  const params = useParams();
  const roomId = Array.isArray(params.id) ? params.id[0] : (params.id ?? "1");

  return <VideoRoom roomId={roomId} />;
}
