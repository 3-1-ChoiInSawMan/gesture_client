"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";

/** 원격 참여자 오디오를 항상 재생 — 카메라 꺼져도 소리는 들려야 함 */
function RemoteAudio({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    el.play().catch(() => {});
    return () => { el.srcObject = null; };
  }, [stream]);
  return <audio ref={ref} autoPlay />;
}
import { useRouter } from "next/navigation";
import { Captions, MicOff, Settings } from "lucide-react";
import StreamVideo from "./StreamVideo";
import { ActivePanel, ChatMessage, Participant } from "./types";
import { SCREEN_SHARE_PARTICIPANT } from "./mockData";
import ParticipantStrip from "./ParticipantStrip";
import VideoControls from "./VideoControls";
import ChatPanel from "./ChatPanel";
import ParticipantsPanel from "./ParticipantsPanel";
import MeetingNotesPanel from "./MeetingNotesPanel";
import InviteModal from "./InviteModal";
import RoomSettingsModal from "./RoomSettingsModal";
import { useSignLanguage } from "./useSignLanguage";
import { useChatSocket } from "./useChatSocket";
import { useWebRTC } from "./useWebRTC";
import { callRoomApi } from "@/api/callRoomApi";
import { useAuthStore } from "@/store/authStore";
import { toast } from "react-toastify";

interface VideoRoomProps {
  roomId: string;
  roomTitle?: string;
  isHost?: boolean;
  isPrivate?: boolean;
}

export default function VideoRoom({
  roomId,
  roomTitle = "통화방",
  isHost = false,
  isPrivate = false,
}: VideoRoomProps) {
  const router = useRouter();
  const { user } = useAuthStore();

  // ── 패널 상태 ─────────────────────────────────────────────
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMeetingNotice, setShowMeetingNotice] = useState(false);

  // ── 컨트롤 상태 ──────────────────────────────────────────
  const [isMicOn, setIsMicOn] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSubtitlesOn, setIsSubtitlesOn] = useState(false);

  // ── 카메라 스트림 ──────────────────────────────────────────
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isCameraOn) {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
        cameraStreamRef.current = null;
        setCameraStream(null);
      }
      return;
    }
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then((stream) => {
        if (cancelled) {
          // isCameraOn이 이미 false로 바뀐 경우 — 획득한 스트림 즉시 해제
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        cameraStreamRef.current = stream;
        setCameraStream(stream);
      })
      .catch(() => { if (!cancelled) setIsCameraOn(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraOn]);

  useEffect(() => {
    return () => { cameraStreamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  // ── 마이크 스트림 ──────────────────────────────────────────
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [myIsSpeaking, setMyIsSpeaking] = useState(false);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioFrameRef = useRef<number | null>(null);

  const cleanupAudio = useCallback(() => {
    if (audioFrameRef.current) cancelAnimationFrame(audioFrameRef.current);
    audioFrameRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    setMicStream(null);
  }, []);

  useEffect(() => {
    if (!isMicOn) {
      cleanupAudio();
      setMyIsSpeaking(false);
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((stream) => {
        audioStreamRef.current = stream;
        setMicStream(stream);
        const ctx = new AudioContext();
        audioContextRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const data = new Uint8Array(analyser.fftSize);
        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (const v of data) { const n = (v - 128) / 128; sum += n * n; }
          setMyIsSpeaking(Math.sqrt(sum / data.length) > 0.02);
          audioFrameRef.current = requestAnimationFrame(tick);
        };
        tick();
      })
      .catch(() => {});
    return cleanupAudio;
  }, [isMicOn, cleanupAudio]);

  // ── 자막 (닉네임 → 텍스트 맵, 동시에 여러 명 자막 표시) ──────
  const [captions, setCaptions] = useState<Map<string, string>>(new Map());
  const captionTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const showCaption = useCallback((name: string, text: string) => {
    setCaptions((prev) => {
      const next = new Map(prev);
      next.set(name, text);
      return next;
    });
    const existing = captionTimersRef.current.get(name);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      setCaptions((prev) => {
        const next = new Map(prev);
        next.delete(name);
        return next;
      });
      captionTimersRef.current.delete(name);
    }, 6000);
    captionTimersRef.current.set(name, timer);
  }, []);

  useEffect(() => {
    return () => { captionTimersRef.current.forEach(clearTimeout); };
  }, []);

  // ── 화면 공유 스트림 ──────────────────────────────────────
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // isDetecting은 useSignLanguage에서 오지만, useWebRTC의 onTranslation 콜백에서
  // 참조해야 하므로 ref로 동기화 (렌더마다 갱신)
  const isDetectingRef = useRef(false);

  // 중복 호출 방지 플래그 (sendLeaveBeacon, handleRoomDeleted 공유)
  const leaveCalledRef = useRef(false);

  const sendLeaveBeacon = useCallback(() => {
    if (leaveCalledRef.current) return;
    leaveCalledRef.current = true;
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    const baseUrl =
      window.location.protocol === "https:"
        ? "/api/v1"
        : (process.env.NEXT_PUBLIC_API_URL ?? "");
    const hostRoomId = localStorage.getItem("host_call_room_id");
    const isHostLeaving = hostRoomId === String(roomId);
    if (isHostLeaving) {
      localStorage.removeItem("host_call_room_id");
    }
    const url = isHostLeaving
      ? `${baseUrl}/call-rooms/${roomId}`
      : `${baseUrl}/call-rooms/${roomId}/leave`;
    fetch(url, {
      method: "DELETE",
      keepalive: true,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    }).catch(() => {});
  }, [roomId]);

  // 방장이 방을 삭제했을 때 — 참여자 전원 메인 화면으로 이동
  const handleRoomDeleted = useCallback(() => {
    if (leaveCalledRef.current) return;
    leaveCalledRef.current = true;
    toast.error("통화방이 삭제되었습니다.");
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    cleanupAudio();
    sessionStorage.removeItem("currentRoomId");
    router.push("/call");
  }, [router, cleanupAudio]);

  // ── WebRTC ───────────────────────────────────────────────
  const { remoteParticipants, sendCaption, sendFrame } = useWebRTC({
    roomId,
    userId: user?.id ?? "",
    nickname: user?.nickname ?? "익명",
    localVideoStream: cameraStream,
    localAudioStream: micStream,
    screenStream,
    isSpeaking: isMicOn && myIsSpeaking,
    onCaption: showCaption,
    onTranslation: (text) => {
      // 내가 실제로 손을 감지 중일 때만 내 번역으로 처리
      // → 여러 명이 카메라 켜도 손이 감지된 사람만 자막 claim
      if (!isDetectingRef.current) return;
      const myName = user?.nickname ?? "나";
      showCaption(myName, text);
      sendCaption(text);
    },
    onRoomDeleted: handleRoomDeleted,
  });

  // 원격 발화 상태는 DataChannel로 수신된 p.isSpeaking 사용
  const remoteSpeakingId = remoteParticipants.find((p) => p.isSpeaking)?.id ?? "";

  // ── 참여자 목록 (나 + 원격) ─────────────────────────────────
  const myParticipant: Participant = useMemo(() => ({
    id: "me",
    name: user?.nickname ?? "나",
    username: user?.id ?? "me",
    isMuted: !isMicOn,
    isCameraOff: !isCameraOn,
  }), [user, isMicOn, isCameraOn]);

  const participants: Participant[] = useMemo(
    () => [myParticipant, ...remoteParticipants],
    [myParticipant, remoteParticipants]
  );

  // 원격 참여자 중 화면 공유 중인 사람
  const screenSharingPeerId = useMemo(
    () => remoteParticipants.find((p) => p.isScreenSharing)?.id ?? null,
    [remoteParticipants]
  );
  // 다른 사람이 공유 중이면 내 공유 버튼 비활성화
  const someoneElseSharing = !!screenSharingPeerId;

  const allParticipants = useMemo(
    () => isScreenSharing ? [...participants, SCREEN_SHARE_PARTICIPANT] : participants,
    [participants, isScreenSharing]
  );

  const [mainParticipantId, setMainParticipantId] = useState("me");
  const mainParticipantIdRef = useRef("me");
  mainParticipantIdRef.current = mainParticipantId;
  const remoteParticipantsRef = useRef<Participant[]>([]);
  remoteParticipantsRef.current = remoteParticipants;

  // ── 원격 참여자 화면 공유 시작/종료 → 메인뷰 자동 전환 ──────
  const prevScreenSharingPeerRef = useRef<string | null>(null);
  const prevMainBeforeScreenShareRef = useRef<string>("me");
  useEffect(() => {
    if (screenSharingPeerId) {
      if (!prevScreenSharingPeerRef.current) {
        // 화면 공유 막 시작 — 이전 메인뷰 저장
        prevMainBeforeScreenShareRef.current = mainParticipantIdRef.current;
      }
      prevScreenSharingPeerRef.current = screenSharingPeerId;
      setMainParticipantId(screenSharingPeerId);
    } else if (prevScreenSharingPeerRef.current) {
      // 화면 공유 종료 — 이전 메인뷰 복원
      prevScreenSharingPeerRef.current = null;
      const restored = prevMainBeforeScreenShareRef.current;
      if (restored === "me") {
        setMainParticipantId("me");
      } else {
        const stillExists = remoteParticipantsRef.current.find((p) => p.id === restored);
        setMainParticipantId(stillExists ? restored : (remoteParticipantsRef.current[0]?.id ?? "me"));
      }
    }
  }, [screenSharingPeerId]);

  // ── 원격 참여자 입장 시 메인뷰 자동 전환 ────────────────────
  const prevRemoteCountRef = useRef(0);
  useEffect(() => {
    if (remoteParticipants.length > 0 && prevRemoteCountRef.current === 0) {
      // 첫 번째 원격 참여자 입장 — 현재 "me"가 메인이면 상대방으로 전환
      if (mainParticipantIdRef.current === "me") {
        setMainParticipantId(remoteParticipants[0].id);
      }
    } else if (remoteParticipants.length === 0 && prevRemoteCountRef.current > 0) {
      // 모든 원격 참여자 퇴장 — 내 화면으로 복귀
      setMainParticipantId("me");
    }
    prevRemoteCountRef.current = remoteParticipants.length;
  }, [remoteParticipants]);

  const mainParticipant = allParticipants.find((p) => p.id === mainParticipantId);

  // ── 스트립 참여자 목록 ─────────────────────────────────────
  // 화면 공유가 메인에 있을 때: 모든 카메라를 스트립에 표시
  // 카메라가 메인에 있을 때: 메인의 참여자는 스트립에서 제외
  const isMainShowingScreen =
    mainParticipantId === "screen-share" || mainParticipantId === screenSharingPeerId;

  const stripParticipants = useMemo(() => {
    const allCameras = [myParticipant, ...remoteParticipants];
    if (isMainShowingScreen) return allCameras;
    return allCameras.filter((p) => p.id !== mainParticipantId);
  }, [myParticipant, remoteParticipants, mainParticipantId, isMainShowingScreen]);

  // 스트립 타일 더블클릭 → 해당 참여자를 메인뷰로
  const handleSelectParticipant = useCallback((selectedId: string) => {
    setMainParticipantId(selectedId);
  }, []);

  const stopScreenShare = useCallback(() => {
    setScreenStream((prev) => {
      prev?.getTracks().forEach((t) => t.stop());
      return null;
    });
    setIsScreenSharing(false);
    setMainParticipantId(remoteParticipantsRef.current[0]?.id ?? "me");
  }, []);

  const handleToggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      stopScreenShare();
      return;
    }
    if (someoneElseSharing) return;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setScreenStream(stream);
      setIsScreenSharing(true);
      setMainParticipantId("screen-share");
      stream.getVideoTracks()[0]?.addEventListener("ended", stopScreenShare);
    } catch {
      // 사용자가 취소한 경우
    }
  }, [isScreenSharing, someoneElseSharing, stopScreenShare]);

  const effectiveSpeakingId =
    isMicOn && myIsSpeaking ? "me" : remoteSpeakingId;

  // ── 컨트롤바 자동숨김 ────────────────────────────────────
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetHideTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [resetHideTimer]);

  // ── 채팅 ────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const handleReceiveMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const { sendMessage: socketSendMessage } = useChatSocket(roomId, handleReceiveMessage);

  // ── 방 정보 ──────────────────────────────────────────────
  const [currentRoomTitle, setCurrentRoomTitle] = useState(roomTitle);
  const [currentIsPrivate, setCurrentIsPrivate] = useState(isPrivate);
  const [currentIsHost, setCurrentIsHost] = useState(isHost);
  const [currentCode, setCurrentCode] = useState("1234");

  useEffect(() => {
    callRoomApi.getRoom(roomId).then((room) => {
      setCurrentRoomTitle(room.title);
      setCurrentIsPrivate(!(room.isPublic ?? true));
      if (user && room.host) {
        setCurrentIsHost(user.id === room.host.userName);
      }
    }).catch(() => {});
  }, [roomId, user]);

  const togglePanel = useCallback((panel: Exclude<ActivePanel, null>) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  }, []);

  const handleOpenMeetingNotes = useCallback(() => {
    if (!currentIsHost) { setShowMeetingNotice(true); return; }
    togglePanel("meeting-notes");
  }, [currentIsHost, togglePanel]);

  const handleSendMessage = useCallback((message: string) => {
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      participantId: "me",
      name: user?.nickname ?? "나",
      username: user?.id ?? "me",
      message,
      time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, newMsg]);
    socketSendMessage(message);
  }, [user, socketSendMessage]);

  const handleEndCall = useCallback(() => {
    sendLeaveBeacon();
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    cleanupAudio();
    screenStream?.getTracks().forEach((t) => t.stop());
    sessionStorage.removeItem("currentRoomId");
    router.push("/call");
  }, [router, cleanupAudio, screenStream, sendLeaveBeacon]);

  // 브라우저 닫기/새로고침 시 통화방 나가기
  useEffect(() => {
    window.addEventListener("pagehide", sendLeaveBeacon);
    window.addEventListener("beforeunload", sendLeaveBeacon);
    return () => {
      window.removeEventListener("pagehide", sendLeaveBeacon);
      window.removeEventListener("beforeunload", sendLeaveBeacon);
    };
  }, [sendLeaveBeacon]);

  // 방 존재 여부 5초 폴링 — 서버가 room_deleted 이벤트를 지원하지 않으므로
  // getRoom 404 응답으로 방 삭제를 감지
  useEffect(() => {
    const id = setInterval(async () => {
      if (leaveCalledRef.current) return;
      try {
        await callRoomApi.getRoom(roomId);
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          handleRoomDeleted();
        }
      }
    }, 5000);
    return () => clearInterval(id);
  }, [roomId, handleRoomDeleted]);

  const handleSaveSettings = useCallback((data: { roomName: string; isPrivate: boolean; code: string }) => {
    setCurrentRoomTitle(data.roomName);
    setCurrentIsPrivate(data.isPrivate);
    setCurrentCode(data.code);
  }, []);

  // ── MediaPipe 수어 인식 ───────────────────────────────────
  // 카메라 ON이면 자막 토글 여부와 무관하게 MediaPipe 실행 + AI 프레임 전송
  // 자막 토글은 오버레이 표시 여부만 제어
  const { isDetecting, isLoading: isMediaPipeLoading } = useSignLanguage(
    cameraStream,
    isCameraOn,
    sendFrame
  );
  // onTranslation 콜백에서 손 감지 여부 참조용 (렌더마다 최신값 유지)
  isDetectingRef.current = isDetecting;

  const isMainSpeaking =
    mainParticipantId === "me"
      ? isMicOn && myIsSpeaking
      : mainParticipantId === "screen-share"
      ? false
      : mainParticipantId === remoteSpeakingId;

  // ── 메인 비디오 콘텐츠 ────────────────────────────────────
  const renderMainVideo = () => {
    if (mainParticipantId === "screen-share" && screenStream) {
      return (
        <StreamVideo
          stream={screenStream}
          muted
          className="absolute inset-0 w-full h-full object-contain"
        />
      );
    }
    if (mainParticipantId === "me" && isCameraOn && cameraStream) {
      return (
        <StreamVideo
          stream={cameraStream}
          mirrored
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
      );
    }
    // 원격 참여자 스트림
    const remotePeer = remoteParticipants.find((p) => p.id === mainParticipantId);
    // 화면 공유 중이면 screenStream 우선 표시
    if (remotePeer?.isScreenSharing && remotePeer.screenStream) {
      return (
        <StreamVideo
          stream={remotePeer.screenStream}
          className="absolute inset-0 w-full h-full object-contain bg-black"
        />
      );
    }
    if (remotePeer?.stream && !remotePeer.isCameraOff) {
      return (
        <StreamVideo
          stream={remotePeer.stream}
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />
      );
    }
    // 카메라 꺼짐 상태 — 스트립 타일과 동일한 회색 아바타
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#2a2a2a]">
        <div className="w-24 h-24 rounded-full bg-[#3a3a3a] flex items-center justify-center">
          <span className="text-4xl text-white font-semibold">
            {mainParticipant?.name[0] ?? "?"}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-black overflow-hidden relative">
      {/* 원격 참여자 오디오 — 카메라 상태와 무관하게 항상 재생 */}
      {remoteParticipants.filter((p) => p.stream).map((p) => (
        <RemoteAudio key={p.id} stream={p.stream!} />
      ))}

      {showMeetingNotice && (
        <MeetingNotesPanel
          isHost={false}
          onClose={() => setShowMeetingNotice(false)}
          onDismissNotice={() => setShowMeetingNotice(false)}
        />
      )}

      {stripParticipants.length === 0 ? (
        <div className="flex items-center justify-center bg-black px-4 py-5 h-[154px]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-7 h-7 border-2 border-[#724BFD] border-t-transparent rounded-full animate-spin" />
            <span className="text-white/50 text-[13px]">상대방 연결 대기 중...</span>
          </div>
        </div>
      ) : (
        <ParticipantStrip
          key={mainParticipantId}
          participants={stripParticipants}
          speakingId={effectiveSpeakingId}
          onSelectParticipant={handleSelectParticipant}
          myStream={cameraStream}
          isCameraOn={isCameraOn}
          screenStream={screenStream}
        />
      )}

      <div
        className="relative flex-1 overflow-hidden bg-black"
        onMouseMove={resetHideTimer}
      >
        <div className="flex h-full gap-2 px-3 pt-2">
          <div className="flex-1 flex items-center justify-center">
            <div className={`shrink-0 rounded-[14px] transition-shadow duration-150 ${
              isMainSpeaking ? "ring-4 ring-[#724BFD]" : ""
            }`}>
              <div className="relative w-[983px] h-[509px] shrink-0 rounded-[12px] overflow-hidden bg-[#111]">
                {renderMainVideo()}

                {/* 닉네임 + 마이크 꺼짐 오버레이 */}
                {mainParticipant && mainParticipantId !== "screen-share" && (
                  <div className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent pointer-events-none z-10">
                    {mainParticipant.isMuted && (
                      <MicOff size={14} className="text-[#FF4444] shrink-0" />
                    )}
                    <span className="text-white text-[13px] font-medium truncate">
                      {mainParticipant.name}
                      {mainParticipant.isHost && (
                        <span className="text-[#AAAAAA] ml-1">(방장)</span>
                      )}
                    </span>
                  </div>
                )}

                {/* 자막 — 메인 비디오 우하단 */}
                {isSubtitlesOn && captions.size > 0 && (
                  <div className="absolute bottom-8 right-3 flex flex-col gap-1 items-end pointer-events-none z-20 max-w-[70%]">
                    {Array.from(captions.entries()).map(([name, text]) => (
                      <p key={name} className="text-white text-[12px] font-medium bg-black/60 px-3 py-1.5 rounded-[6px] leading-relaxed">
                        <span className="font-bold text-[#724BFD]">{name}</span>
                        {" : "}
                        {text}
                      </p>
                    ))}
                  </div>
                )}

                {isSubtitlesOn && (
                  <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                    <div className="flex items-center gap-1 bg-[#724BFD]/80 text-white text-[10px] font-medium px-2 py-1 rounded-full">
                      <Captions size={12} />
                      자막 ON
                    </div>
                    {isCameraOn && (
                      isMediaPipeLoading ? (
                        <div className="flex items-center gap-1 bg-black/50 text-white/60 text-[10px] font-medium px-2 py-1 rounded-full">
                          <span className="w-3 h-3 border border-white/40 border-t-white/80 rounded-full animate-spin" />
                          모델 로딩 중...
                        </div>
                      ) : (
                        <div className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full ${
                          isDetecting ? "bg-[#4CAF50]/80 text-white" : "bg-black/50 text-white/60"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isDetecting ? "bg-white animate-pulse" : "bg-white/40"}`} />
                          {isDetecting ? "손 감지됨" : "손 미감지"}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {activePanel === "chat" && (
            <ChatPanel
              roomTitle={currentRoomTitle}
              messages={messages}
              onClose={() => setActivePanel(null)}
              onSendMessage={handleSendMessage}
            />
          )}
          {activePanel === "participants" && (
            <ParticipantsPanel
              participants={participants}
              onClose={() => setActivePanel(null)}
              onInvite={() => setShowInviteModal(true)}
            />
          )}
          {activePanel === "meeting-notes" && currentIsHost && (
            <MeetingNotesPanel isHost={true} onClose={() => setActivePanel(null)} />
          )}
        </div>

        {/* 하단 컨트롤바 */}
        <div className={`absolute bottom-0 left-0 right-0 z-40 transition-opacity duration-300 ${
          controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}>
          <VideoControls
            isMicOn={isMicOn}
            isCameraOn={isCameraOn}
            isScreenSharing={isScreenSharing}
            isSubtitlesOn={isSubtitlesOn}
            activePanel={activePanel}
            someoneElseSharing={someoneElseSharing}
            onToggleMic={() => setIsMicOn((v) => !v)}
            onToggleCamera={() => setIsCameraOn((v) => !v)}
            onToggleScreenShare={handleToggleScreenShare}
            onToggleSubtitles={() => setIsSubtitlesOn((v) => !v)}
            onOpenChat={() => togglePanel("chat")}
            onOpenMeetingNotes={handleOpenMeetingNotes}
            onOpenParticipants={() => togglePanel("participants")}
            onEndCall={handleEndCall}
          />
        </div>

        <button
          onClick={() => setShowSettingsModal(true)}
          title="통화방 설정"
          className="absolute bottom-[19px] left-0 ml-[39px] z-50 w-10 h-10 flex items-center justify-center text-white hover:bg-white/10 rounded-[10px] transition-colors"
        >
          <Settings size={22} />
        </button>
      </div>

      {showInviteModal && <InviteModal roomId={roomId} onClose={() => setShowInviteModal(false)} />}
      {showSettingsModal && (
        <RoomSettingsModal
          roomTitle={currentRoomTitle}
          isPrivate={currentIsPrivate}
          currentCode={currentCode}
          onClose={() => setShowSettingsModal(false)}
          onSave={handleSaveSettings}
        />
      )}
    </div>
  );
}
