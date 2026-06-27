"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import VideoRoom from "@/components/videoroom/VideoRoom";
import { callRoomApi, JoinCallResponse } from "@/api/callRoomApi";
import { toast } from "react-toastify";

const joinRequests = new Map<string, Promise<JoinCallResponse>>();

function joinCall(roomId: string): Promise<JoinCallResponse> {
  const existing = joinRequests.get(roomId);
  if (existing) return existing;

  const request = callRoomApi.joinCall(roomId).catch((error) => {
    joinRequests.delete(roomId);
    throw error;
  });
  joinRequests.set(roomId, request);
  const clearRequest = () => {
    window.setTimeout(() => {
      if (joinRequests.get(roomId) === request) {
        joinRequests.delete(roomId);
      }
    }, 5000);
  };
  void request.then(clearRequest, clearRequest);
  return request;
}

export default function RoomPage() {
  const router = useRouter();
  const [callSession, setCallSession] = useState<{
    roomId: string;
    callIdx: number;
  } | null>(null);

  useEffect(() => {
    const id = sessionStorage.getItem("currentRoomId");
    if (!id) {
      router.replace("/call");
      return;
    }
    let cancelled = false;
    joinCall(id)
      .then((call) => {
        if (!cancelled) {
          setCallSession({ roomId: id, callIdx: call.callIdx });
        }
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          (error as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? "통화에 참여하지 못했습니다.";
        toast.error(message);
        sessionStorage.removeItem("currentRoomId");
        router.replace("/call");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!callSession) return null;

  return (
    <VideoRoom
      roomId={callSession.roomId}
      callIdx={callSession.callIdx}
    />
  );
}
