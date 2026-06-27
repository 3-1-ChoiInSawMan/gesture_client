"use client";

import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Captions,
  MessageSquare,
  ClipboardList,
  Zap,
  Users,
  PhoneOff,
} from "lucide-react";

interface VideoControlsProps {
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isSubtitlesOn: boolean;
  activePanel: string | null;
  someoneElseSharing?: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleSubtitles: () => void;
  onOpenChat: () => void;
  onOpenMeetingNotes: () => void;
  onOpenQuickSlots: () => void;
  onOpenParticipants: () => void;
  onEndCall: () => void;
}

interface ControlButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  /** 기능이 켜진 상태 (자막, 화면공유, 패널 열림) — 보라색 */
  active?: boolean;
  /** 장치가 꺼진 상태 (마이크 꺼짐, 카메라 꺼짐) — 빨간색 */
  off?: boolean;
  danger?: boolean;
  disabled?: boolean;
}

function ControlButton({ icon, label, onClick, active, off, danger, disabled }: ControlButtonProps) {
  const bgClass = disabled
    ? "opacity-30 cursor-not-allowed"
    : danger
    ? "bg-[#FF4444] hover:bg-[#e03030]"
    : off
    ? "bg-[#FF4444]/20 hover:bg-[#FF4444]/30"
    : active
    ? "bg-[#724BFD]/20 hover:bg-[#724BFD]/30"
    : "hover:bg-white/10";

  const colorClass = danger
    ? "text-white"
    : off
    ? "text-[#FF6B6B]"
    : active
    ? "text-[#724BFD]"
    : "text-white";

  const labelClass = danger
    ? "text-white"
    : off
    ? "text-[#FF6B6B]"
    : active
    ? "text-[#724BFD]"
    : "text-[#CCCCCC]";

  return (
    <button
      onClick={disabled ? undefined : onClick}
      title={label}
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-[10px] transition-colors ${bgClass}`}
    >
      <span className={colorClass}>{icon}</span>
      <span className={`text-[10px] font-medium ${labelClass}`}>{label}</span>
    </button>
  );
}

export default function VideoControls({
  isMicOn,
  isCameraOn,
  isScreenSharing,
  isSubtitlesOn,
  activePanel,
  someoneElseSharing,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onToggleSubtitles,
  onOpenChat,
  onOpenMeetingNotes,
  onOpenQuickSlots,
  onOpenParticipants,
  onEndCall,
}: VideoControlsProps) {
  return (
    <div className="flex items-center justify-between bg-black/70 px-6 py-3">
      {/* 왼쪽 스페이서 (설정 아이콘 영역 — VideoRoom에서 absolute로 렌더링) */}
      <div className="w-10 ml-[39px] shrink-0" />

      {/* 중앙 컨트롤 */}
      <div className="flex items-center gap-1">
        <ControlButton
          icon={isMicOn ? <Mic size={22} /> : <MicOff size={22} />}
          label="마이크"
          onClick={onToggleMic}
          off={!isMicOn}
        />
        <ControlButton
          icon={isCameraOn ? <Video size={22} /> : <VideoOff size={22} />}
          label="카메라"
          onClick={onToggleCamera}
          off={!isCameraOn}
        />
        <ControlButton
          icon={<Monitor size={22} />}
          label={someoneElseSharing && !isScreenSharing ? "공유 중" : "화면 공유"}
          onClick={onToggleScreenShare}
          active={isScreenSharing}
          disabled={someoneElseSharing && !isScreenSharing}
        />
        <ControlButton
          icon={<Captions size={22} />}
          label="자막"
          onClick={onToggleSubtitles}
          active={isSubtitlesOn}
        />
        <ControlButton
          icon={<MessageSquare size={22} />}
          label="채팅"
          onClick={onOpenChat}
          active={activePanel === "chat"}
        />
        <ControlButton
          icon={<ClipboardList size={22} />}
          label="회의록"
          onClick={onOpenMeetingNotes}
          active={activePanel === "meeting-notes"}
        />
        <ControlButton
          icon={<Zap size={22} />}
          label="퀵슬롯"
          onClick={onOpenQuickSlots}
          active={activePanel === "quick-slots"}
        />
        <ControlButton
          icon={<Users size={22} />}
          label="참여자"
          onClick={onOpenParticipants}
          active={activePanel === "participants"}
        />
      </div>

      {/* 통화 종료 */}
      <ControlButton
        icon={<PhoneOff size={22} />}
        label="종료"
        onClick={onEndCall}
        danger
      />
    </div>
  );
}
