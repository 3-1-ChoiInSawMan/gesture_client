"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Captions, Settings } from "lucide-react";
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

  useEffect(() => {
    if (!isCameraOn) {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
        setCameraStream(null);
      }
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" }, audio: false })
      .then(setCameraStream)
      .catch(() => setIsCameraOn(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraOn]);

  useEffect(() => {
    return () => { cameraStream?.getTracks().forEach((t) => t.stop()); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ── 화면 공유 스트림 ──────────────────────────────────────
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // ── WebRTC ───────────────────────────────────────────────
  const { remoteParticipants } = useWebRTC({
    roomId,
    userId: user?.id ?? "",
    nickname: user?.nickname ?? "익명",
    localVideoStream: cameraStream,
    localAudioStream: micStream,
  });

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

  const speakingParticipant = remoteParticipants.find((p) => p.isSpeaking);

  const allParticipants = useMemo(
    () => isScreenSharing ? [...participants, SCREEN_SHARE_PARTICIPANT] : participants,
    [participants, isScreenSharing]
  );

  const [mainParticipantId, setMainParticipantId] = useState("me");
  const [stripOrder, setStripOrder] = useState<string[]>([]);

  // 원격 참여자 변경 시 stripOrder 동기화
  useEffect(() => {
    setStripOrder((prev) => {
      const remoteIds = remoteParticipants.map((p) => p.id);
      const kept = prev.filter((id) => remoteIds.includes(id));
      const added = remoteIds.filter((id) => !prev.includes(id));
      return [...kept, ...added];
    });
  }, [remoteParticipants]);

  const mainParticipant = allParticipants.find((p) => p.id === mainParticipantId);
  const stripParticipants = stripOrder
    .map((id) => allParticipants.find((p) => p.id === id))
    .filter((p): p is Participant => !!p);

  const handleSelectParticipant = useCallback((selectedId: string) => {
    setStripOrder((prev) => {
      const idx = prev.indexOf(selectedId);
      const next = [...prev];
      next[idx] = mainParticipantId;
      return next;
    });
    setMainParticipantId(selectedId);
  }, [mainParticipantId]);

  const stopScreenShare = useCallback(() => {
    setScreenStream((prev) => {
      prev?.getTracks().forEach((t) => t.stop());
      return null;
    });
    setIsScreenSharing(false);
    setMainParticipantId((prev) => {
      if (prev !== "screen-share") return prev;
      setStripOrder((s) => s.filter((id) => id !== "screen-share"));
      return "me";
    });
    setStripOrder((prev) => prev.filter((id) => id !== "screen-share"));
  }, []);

  const handleToggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      stopScreenShare();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      setScreenStream(stream);
      setIsScreenSharing(true);
      setStripOrder((prev) => [mainParticipantId, ...prev]);
      setMainParticipantId("screen-share");
      stream.getVideoTracks()[0]?.addEventListener("ended", stopScreenShare);
    } catch {
      // 사용자가 취소한 경우
    }
  }, [isScreenSharing, mainParticipantId, stopScreenShare]);

  const effectiveSpeakingId =
    isMicOn && myIsSpeaking ? "me" : (speakingParticipant?.id ?? "");

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

  const handleEndCall = useCallback(() => router.push("/call"), [router]);

  const handleSaveSettings = useCallback((data: { roomName: string; isPrivate: boolean; code: string }) => {
    setCurrentRoomTitle(data.roomName);
    setCurrentIsPrivate(data.isPrivate);
    setCurrentCode(data.code);
  }, []);

  // ── MediaPipe 수어 인식 ───────────────────────────────────
  const { transcript: slttTranscript, isDetecting } = useSignLanguage(
    cameraStream,
    isSubtitlesOn && isCameraOn
  );

  const subtitleBottom = controlsVisible ? 88 : 16;

  const isMainSpeaking =
    mainParticipantId === "me"
      ? isMicOn && myIsSpeaking
      : mainParticipantId === "screen-share"
      ? false
      : mainParticipantId === speakingParticipant?.id;

  // ── 메인 비디오 콘텐츠 ────────────────────────────────────
  const renderMainVideo = () => {
    if (mainParticipantId === "screen-share" && screenStream) {
      return (
        <StreamVideo
          stream={screenStream}
          className="absolute inset-0 w-full h-full object-contain"
        />
      );
    }
    if (mainParticipantId === "me" && isCameraOn && cameraStream) {
      return (
        <StreamVideo
          stream={cameraStream}
          mirrored
          className="absolute inset-0 w-full h-full object-cover"
        />
      );
    }
    // 원격 참여자 스트림
    const remotePeer = remoteParticipants.find((p) => p.id === mainParticipantId);
    if (remotePeer?.stream) {
      return (
        <StreamVideo
          stream={remotePeer.stream}
          className="absolute inset-0 w-full h-full object-cover"
        />
      );
    }
    return (
      <div
        className="w-full h-full"
        style={{ background: "linear-gradient(180deg, #0d1b2a 0%, #1a2d1a 50%, #0d1b0d 100%)" }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 rounded-full bg-white/5 flex items-center justify-center">
            <span className="text-6xl text-white/20 font-light">
              {mainParticipant?.name[0] ?? "?"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-black overflow-hidden relative">
      {showMeetingNotice && (
        <MeetingNotesPanel
          isHost={false}
          onClose={() => setShowMeetingNotice(false)}
          onDismissNotice={() => setShowMeetingNotice(false)}
        />
      )}

      <ParticipantStrip
        participants={stripParticipants}
        speakingId={effectiveSpeakingId}
        onSelectParticipant={handleSelectParticipant}
        myStream={cameraStream}
        isCameraOn={isCameraOn}
        screenStream={screenStream}
      />

      <div
        className="relative flex-1 overflow-hidden bg-black"
        onMouseMove={resetHideTimer}
      >
        <div className="flex h-full gap-2 px-3 pt-2">
          <div className="flex-1 flex items-center justify-center">
            <div className={`shrink-0 rounded-[14px] transition-shadow duration-150 ${
              isMainSpeaking ? "ring-4 ring-[#4CAF50]" : ""
            }`}>
              <div className="relative w-[983px] h-[509px] shrink-0 rounded-[12px] overflow-hidden bg-[#111]">
                {renderMainVideo()}

                {isSubtitlesOn && (
                  <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                    <div className="flex items-center gap-1 bg-[#724BFD]/80 text-white text-[10px] font-medium px-2 py-1 rounded-full">
                      <Captions size={12} />
                      자막 ON
                    </div>
                    {isCameraOn && (
                      <div className={`flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full ${
                        isDetecting ? "bg-[#4CAF50]/80 text-white" : "bg-black/50 text-white/60"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isDetecting ? "bg-white animate-pulse" : "bg-white/40"}`} />
                        {isDetecting ? "손 감지됨" : "손 미감지"}
                      </div>
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

        {/* 자막 오버레이 */}
        <div
          className="absolute left-0 right-0 flex justify-center pointer-events-none z-30"
          style={{ bottom: subtitleBottom, transition: "bottom 0.3s ease" }}
        >
          {isSubtitlesOn && slttTranscript && (
            <div className="w-[983px] max-w-full flex flex-col gap-1 px-4">
              <p className="text-white text-[12px] font-medium bg-black/50 px-3 py-1.5 rounded-[6px] leading-relaxed">
                {slttTranscript}
              </p>
            </div>
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
