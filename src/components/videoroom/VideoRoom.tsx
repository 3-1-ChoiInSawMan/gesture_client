"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Captions } from "lucide-react";
import { ActivePanel, ChatMessage, Participant } from "./types";
import { MOCK_MESSAGES, MOCK_PARTICIPANTS } from "./mockData";
import ParticipantStrip from "./ParticipantStrip";
import VideoControls from "./VideoControls";
import ChatPanel from "./ChatPanel";
import ParticipantsPanel from "./ParticipantsPanel";
import MeetingNotesPanel from "./MeetingNotesPanel";
import InviteModal from "./InviteModal";
import RoomSettingsModal from "./RoomSettingsModal";

interface VideoRoomProps {
  roomId: string;
  roomTitle?: string;
  isHost?: boolean;
  isPrivate?: boolean;
}

const MOCK_SUBTITLE =
  "이현무산학교사칭변지우박지우원제수영어부지리코디위엄도라지팔";

export default function VideoRoom({
  roomId,
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
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSubtitlesOn, setIsSubtitlesOn] = useState(false);

  // ── 채팅 ────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);

  // ── 참여자 ──────────────────────────────────────────────
  const [participants] = useState<Participant[]>(MOCK_PARTICIPANTS);
  const speakingParticipant = participants.find((p) => p.isSpeaking);

  // ── 방 정보 ──────────────────────────────────────────────
  const [currentRoomTitle, setCurrentRoomTitle] = useState(roomTitle);
  const [currentIsPrivate, setCurrentIsPrivate] = useState(isPrivate);
  const [currentCode, setCurrentCode] = useState("1234");

  const togglePanel = (panel: Exclude<ActivePanel, null>) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  const handleOpenMeetingNotes = () => {
    if (!isHost) {
      setShowMeetingNotice(true);
      return;
    }
    togglePanel("meeting-notes");
  };

  const handleSendMessage = (message: string) => {
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      participantId: "me",
      name: "나",
      username: "me",
      message,
      time: new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages((prev) => [...prev, newMsg]);
  };

  const handleEndCall = () => {
    router.push("/call");
  };

  const handleSaveSettings = (data: {
    roomName: string;
    isPrivate: boolean;
    code: string;
  }) => {
    setCurrentRoomTitle(data.roomName);
    setCurrentIsPrivate(data.isPrivate);
    setCurrentCode(data.code);
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-black overflow-hidden relative">
      {/* 비-방장 회의록 알림 배너 */}
      {showMeetingNotice && (
        <MeetingNotesPanel
          isHost={false}
          onClose={() => setShowMeetingNotice(false)}
          onDismissNotice={() => setShowMeetingNotice(false)}
        />
      )}

      {/* 참여자 스트립 */}
      <ParticipantStrip
        participants={participants}
        speakingId={speakingParticipant?.id ?? "2"}
      />

      {/* 메인 영역: 비디오 + 패널 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 메인 비디오 */}
        <div className="relative flex-1 bg-[#111] overflow-hidden">
          {/* 비디오 목업 */}
          <div
            className="w-full h-full"
            style={{
              background:
                "linear-gradient(180deg, #0d1b2a 0%, #1a2d1a 50%, #0d1b0d 100%)",
            }}
          >
            {/* 중앙 발표자 표시 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-white/5 flex items-center justify-center">
                <span className="text-6xl text-white/20 font-light">
                  {speakingParticipant?.name[0] ?? "권"}
                </span>
              </div>
            </div>
          </div>

          {/* 자막 오버레이 */}
          {isSubtitlesOn && (
            <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-1 pointer-events-none">
              <p className="text-white text-[12px] font-medium bg-black/50 px-3 py-1.5 rounded-[6px] leading-relaxed">
                {MOCK_SUBTITLE}
              </p>
              <p className="text-white text-[12px] font-medium bg-black/50 px-3 py-1.5 rounded-[6px] leading-relaxed">
                {MOCK_SUBTITLE}
                ㅇㄹㅂㄱㅈㄷ
              </p>
            </div>
          )}

          {/* 자막 미사용 시 텍스트 오버레이 (상시 표시) */}
          {!isSubtitlesOn && (
            <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-1 pointer-events-none">
              <p className="text-white/70 text-[11px] font-medium bg-black/40 px-3 py-1 rounded-[6px] leading-relaxed">
                {MOCK_SUBTITLE}
              </p>
              <p className="text-white/70 text-[11px] font-medium bg-black/40 px-3 py-1 rounded-[6px] leading-relaxed">
                {MOCK_SUBTITLE}
                ㅇㄹㅂㄱㅈㄷ
              </p>
            </div>
          )}

          {/* 자막 토글 인디케이터 */}
          {isSubtitlesOn && (
            <div className="absolute top-3 right-3 flex items-center gap-1 bg-[#724BFD]/80 text-white text-[10px] font-medium px-2 py-1 rounded-full">
              <Captions size={12} />
              자막 ON
            </div>
          )}
        </div>

        {/* 오른쪽 패널 */}
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
        {activePanel === "meeting-notes" && isHost && (
          <MeetingNotesPanel
            isHost={true}
            onClose={() => setActivePanel(null)}
          />
        )}
      </div>

      {/* 하단 컨트롤 바 */}
      <VideoControls
        isMicOn={isMicOn}
        isCameraOn={isCameraOn}
        isScreenSharing={isScreenSharing}
        isSubtitlesOn={isSubtitlesOn}
        activePanel={activePanel}
        onToggleMic={() => setIsMicOn((v) => !v)}
        onToggleCamera={() => setIsCameraOn((v) => !v)}
        onToggleScreenShare={() => setIsScreenSharing((v) => !v)}
        onToggleSubtitles={() => setIsSubtitlesOn((v) => !v)}
        onOpenChat={() => togglePanel("chat")}
        onOpenMeetingNotes={handleOpenMeetingNotes}
        onOpenParticipants={() => togglePanel("participants")}
        onOpenSettings={() => setShowSettingsModal(true)}
        onEndCall={handleEndCall}
      />

      {/* 초대 모달 */}
      {showInviteModal && (
        <InviteModal onClose={() => setShowInviteModal(false)} />
      )}

      {/* 설정 모달 */}
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
