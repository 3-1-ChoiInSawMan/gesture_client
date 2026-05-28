import { CallRoomData } from "@/components/home/CallRoom";

export const MOCK_ROOMS: CallRoomData[] = [
  { id: 1, username: "임영웅", profileImage: null, title: "수화 배울 사람 들어와", category: "스터디", isPrivate: true, participants: 12, maxParticipants: 20, minutesAgo: 15 },
  { id: 2, username: "임영웅", profileImage: null, title: "수화 배울 사람 들어와", category: "일반", isPrivate: false, participants: 8, maxParticipants: 10, minutesAgo: 3 },
  { id: 3, username: "임영웅", profileImage: null, title: "수화 배울 사람 들어와", category: "회의방", isPrivate: false, participants: 20, maxParticipants: 30, minutesAgo: 30 },
  { id: 4, username: "임영웅", profileImage: null, title: "수화 배울 사람 들어와", category: "스터디", isPrivate: false, participants: 5, maxParticipants: 10, minutesAgo: 7 },
  { id: 5, username: "임영웅", profileImage: null, title: "수화 배울 사람 들어와", category: "일반", isPrivate: true, participants: 3, maxParticipants: 10, minutesAgo: 1 },
];
