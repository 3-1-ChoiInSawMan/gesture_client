import { Participant, ChatMessage } from "./types";

export const MOCK_SUBTITLE =
  "이현무산학교사칭변지우박지우원제수영어부지리코디위엄도라지팔";

export const SCREEN_SHARE_PARTICIPANT: Participant = {
  id: "screen-share",
  name: "화면 공유",
  username: "screen-share",
};

export const MOCK_PARTICIPANTS: Participant[] = [
  {
    id: "me",
    name: "나",
    username: "me",
    isHost: false,
    isMuted: false,
    isCameraOff: false,
    isSpeaking: false,
  },
  {
    id: "1",
    name: "이현우",
    username: "hyunwoo_lee",
    isHost: false,
    isMuted: true,
    isCameraOff: true,
    isSpeaking: false,
  },
  {
    id: "2",
    name: "권수영",
    username: "new_im_young",
    isHost: false,
    isMuted: true,
    isCameraOff: true,
    isSpeaking: false,
  },
  {
    id: "3",
    name: "최인소",
    username: "gaming",
    isHost: true,
    isMuted: true,
    isCameraOff: true,
    isSpeaking: false,
  },
  {
    id: "4",
    name: "권수영",
    username: "gaming2",
    isHost: false,
    isMuted: true,
    isCameraOff: true,
    isSpeaking: false,
  },
  {
    id: "5",
    name: "김태영",
    username: "pawni",
    isHost: false,
    isMuted: true,
    isCameraOff: true,
    isSpeaking: false,
  },
  {
    id: "6",
    name: "권수영",
    username: "pawni2",
    isHost: false,
    isMuted: true,
    isCameraOff: true,
    isSpeaking: false,
  },
  {
    id: "7",
    name: "권수영",
    username: "pawni3",
    isHost: false,
    isMuted: true,
    isCameraOff: true,
    isSpeaking: false,
  },
];

export const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    participantId: "2",
    name: "공인영",
    username: "new_im_young",
    message: "일탈 조흔 벽돌이 소리는 tick tock",
    time: "12:32 PM",
  },
  {
    id: "2",
    participantId: "3",
    name: "김태영",
    username: "new_im_young2",
    message: "이야 한 신을 쉽게 봤더니 나 벌받 쟀네",
    time: "12:33 PM",
  },
  {
    id: "3",
    participantId: "1",
    name: "이현우",
    username: "hyunwoo_lee",
    message: "잘났어 틀린 게 전혀 없어 보이는 건 말 없어",
    time: "12:34 PM",
  },
];

export const INVITE_CANDIDATES: (Participant & { invited?: boolean })[] = [
  {
    id: "inv1",
    name: "권수영",
    username: "username",
    invited: false,
  },
  {
    id: "inv2",
    name: "권수영",
    username: "username",
    invited: false,
  },
  {
    id: "inv3",
    name: "길쭈노긴쩌근꽤긴수영",
    username: "username",
    invited: true,
  },
];
