"use client";

import {
  Settings,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Captions,
  MessageSquare,
  ClipboardList,
  Users,
  PhoneOff,
} from "lucide-react";

interface VideoControlsProps {
  isMicOn: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  isSubtitlesOn: boolean;
  activePanel: string | null;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleSubtitles: () => void;
  onOpenChat: () => void;
  onOpenMeetingNotes: () => void;
  onOpenParticipants: () => void;
  onOpenSettings: () => void;
  onEndCall: () => void;
}

interface ControlButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
}

function ControlButton({ icon, label, onClick, active, danger }: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-[10px] transition-colors group ${
        danger
          ? "bg-[#FF4444] hover:bg-[#e03030]"
          : active
          ? "bg-white/20"
          : "hover:bg-white/10"
      }`}
    >
      <span className={danger ? "text-white" : active ? "text-[#724BFD]" : "text-white"}>
        {icon}
      </span>
      <span
        className={`text-[10px] font-medium ${
          danger ? "text-white" : active ? "text-[#724BFD]" : "text-[#CCCCCC]"
        }`}
      >
        {label}
      </span>
    </button>
  );
}

export default function VideoControls({
  isMicOn,
  isCameraOn,
  isScreenSharing,
  isSubtitlesOn,
  activePanel,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onToggleSubtitles,
  onOpenChat,
  onOpenMeetingNotes,
  onOpenParticipants,
  onOpenSettings,
  onEndCall,
}: VideoControlsProps) {
  return (
    <div className="flex items-center justify-between bg-[#1a1a1a] px-6 py-3 border-t border-white/10">
      {/* 설정 */}
      <button
        onClick={onOpenSettings}
        title="통화방 설정"
        className="flex items-center justify-center w-10 h-10 rounded-[10px] text-white hover:bg-white/10 transition-colors"
      >
        <Settings size={22} />
      </button>

      {/* 중앙 컨트롤 */}
      <div className="flex items-center gap-1">
        <ControlButton
          icon={isMicOn ? <Mic size={22} /> : <MicOff size={22} />}
          label={isMicOn ? "마이크" : "마이크 꺼짐"}
          onClick={onToggleMic}
          active={!isMicOn}
        />
        <ControlButton
          icon={isCameraOn ? <Video size={22} /> : <VideoOff size={22} />}
          label={isCameraOn ? "카메라" : "카메라 꺼짐"}
          onClick={onToggleCamera}
          active={!isCameraOn}
        />
        <ControlButton
          icon={<Monitor size={22} />}
          label="화면 공유"
          onClick={onToggleScreenShare}
          active={isScreenSharing}
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
