export interface Participant {
  id: string;
  name: string;
  username: string;
  userIdx?: number;
  profileImage?: string;
  isHost?: boolean;
  isMuted?: boolean;
  isCameraOff?: boolean;
  isSpeaking?: boolean;
  isScreenSharing?: boolean;
  role?: string;
  stream?: MediaStream;
  screenStream?: MediaStream;
}

export interface ChatMessage {
  id: string;
  participantId: string;
  name: string;
  username: string;
  message: string;
  time: string;
}

export type ActivePanel = "chat" | "participants" | "meeting-notes" | null;
