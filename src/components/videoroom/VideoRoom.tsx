"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Captions, Settings } from "lucide-react";
import StreamVideo from "./StreamVideo";
import { ActivePanel, ChatMessage, Participant } from "./types";
import { MOCK_MESSAGES, MOCK_PARTICIPANTS, MOCK_SUBTITLE, SCREEN_SHARE_PARTICIPANT } from "./mockData";
import ParticipantStrip from "./ParticipantStrip";
import VideoControls from "./VideoControls";
import ChatPanel from "./ChatPanel";
import ParticipantsPanel from "./ParticipantsPanel";
import MeetingNotesPanel from "./MeetingNotesPanel";
import InviteModal from "./InviteModal";
import RoomSettingsModal from "./RoomSettingsModal";
import { useSignLanguage } from "./useSignLanguage";

interface VideoRoomProps {
  roomId: string;
  roomTitle?: string;
  isHost?: boolean;
  isPrivate?: boolean;
}

export default function VideoRoom({
  roomId: _roomId,
  roomTitle = "수화 배울 사람 들어와",
  isHost = true,
  isPrivate = true,
}: VideoRoomProps) {
  const router = useRouter();

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

  // ── 채팅 ────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);

  // ── 참여자 ────────────────────────────────────────────────
  const [participants] = useState<Participant[]>(MOCK_PARTICIPANTS);
  const speakingParticipant = participants.find((p) => p.isSpeaking);

  const participantsWithMyState = useMemo(
    () =>
      participants.map((p) =>
        p.id === "me" ? { ...p, isMuted: !isMicOn, isCameraOff: !isCameraOn } : p
      ),
    [participants, isMicOn, isCameraOn]
  );

  const allParticipants = useMemo(
    () =>
      isScreenSharing
        ? [...participantsWithMyState, SCREEN_SHARE_PARTICIPANT]
        : participantsWithMyState,
    [participantsWithMyState, isScreenSharing]
  );

  const [mainParticipantId, setMainParticipantId] = useState("me");
  const [stripOrder, setStripOrder] = useState(
    participants.filter((p) => p.id !== "me").map((p) => p.id)
  );

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

  // ── 화면 공유 스트림 ──────────────────────────────────────
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

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

  // ── 마이크 음성 감지 ──────────────────────────────────────
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

  // ── 방 정보 ──────────────────────────────────────────────
  const [currentRoomTitle, setCurrentRoomTitle] = useState(roomTitle);
  const [currentIsPrivate, setCurrentIsPrivate] = useState(isPrivate);
  const [currentCode, setCurrentCode] = useState("1234");

  const togglePanel = useCallback((panel: Exclude<ActivePanel, null>) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  }, []);

  const handleOpenMeetingNotes = useCallback(() => {
    if (!isHost) { setShowMeetingNotice(true); return; }
    togglePanel("meeting-notes");
  }, [isHost, togglePanel]);

  const handleSendMessage = useCallback((message: string) => {
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      participantId: "me",
      name: "나",
      username: "me",
      message,
      time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, newMsg]);
  }, []);

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
    return (
      <div
        className="w-full h-full"
        style={{ background: "linear-gradient(180deg, #0d1b2a 0%, #1a2d1a 50%, #0d1b0d 100%)" }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 rounded-full bg-white/5 flex items-center justify-center">
            <span className="text-6xl text-white/20 font-light">
              {mainParticipant?.name[0] ?? "권"}
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
              participants={participantsWithMyState}
              onClose={() => setActivePanel(null)}
              onInvite={() => setShowInviteModal(true)}
            />
          )}
          {activePanel === "meeting-notes" && isHost && (
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

      {showInviteModal && <InviteModal onClose={() => setShowInviteModal(false)} />}
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
