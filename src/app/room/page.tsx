"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import VideoRoom from "@/components/videoroom/VideoRoom";
import { callRoomApi, JoinCallResponse } from "@/api/callRoomApi";
import { toast } from "react-toastify";

const joinRequests = new Map<string, Promise<JoinCallResponse>>();

const toJoinCallResponse = (
  call: Awaited<ReturnType<typeof callRoomApi.getCallParticipants>>
): JoinCallResponse => ({
  callIdx: call.callIdx,
  roomIdx: call.roomIdx,
  userIdx: 0,
  joinedAt: "",
  currentParticipant: call.currentParticipant,
  maxParticipant: 0,
});

async function findCurrentCall(
  roomId: string,
  attempts = 5
): Promise<JoinCallResponse | null> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const call = await callRoomApi.getCallParticipants(roomId);
      if (call.callIdx) return toJoinCallResponse(call);
    } catch {
      // 방 생성 직후에는 통화 데이터가 아직 조회되지 않을 수 있다.
    }
    await new Promise((resolve) => window.setTimeout(resolve, 250));
  }
  return null;
}

function joinCall(roomId: string): Promise<JoinCallResponse> {
  const existing = joinRequests.get(roomId);
  if (existing) return existing;

  const request = (async () => {
    const isHost =
      localStorage.getItem("host_call_room_id") === String(roomId);
    if (isHost) {
      const currentCall = await findCurrentCall(roomId);
      if (currentCall) return currentCall;
    }

    try {
      return await callRoomApi.joinCall(roomId);
    } catch (error) {
      const response = (
        error as { response?: { status?: number; data?: { message?: string } } }
      )?.response;
      const message = response?.data?.message ?? "";
      const isAlreadyJoined =
        response?.status === 409 ||
        message.includes("이미 참여") ||
        message.toLowerCase().includes("already");

      if (isAlreadyJoined) {
        const currentCall = await findCurrentCall(roomId);
        if (currentCall) return currentCall;
      }

      throw error;
    }
  })().catch((error) => {
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
