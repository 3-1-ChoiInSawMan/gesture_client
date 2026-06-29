export interface ChatMember {
  id: string;
  nickname: string;
  username: string;
  profileImage?: string;
}

export interface ChatRoom {
  id: string;
  chatRoomIdx: number;
  targetUserIdx?: number;
  name: string;
  isGroup: boolean;
  members: ChatMember[];
  lastMessage: string;
  lastMessageTime: string;
  avatarUrl?: string;
  unreadCount?: number;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderUsername: string;
  senderProfileImage?: string;
  content: string;
  time: string;
  date: string;
  replyToName?: string;
}

export type FriendStatus = "friend" | "sent" | "none";

export interface FriendUser {
  id: string;
  nickname: string;
  username: string;
  profileImage?: string;
  status: FriendStatus;
}
