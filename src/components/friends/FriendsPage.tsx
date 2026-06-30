"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import ChatSidebar from "./sidebar/ChatSidebar";
import ChatWindow from "./chat/ChatWindow";
import EmptyChatView from "./EmptyChatView";
import AddFriendModal from "./modals/AddFriendModal";
import SendMessageModal from "./modals/SendMessageModal";
import FriendRequestsModal from "./modals/FriendRequestsModal";
import { chatRoomApi, ChatRoomSummary } from "@/api/chatRoomApi";
import { ChatRoom } from "./types";

const formatMessageTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

async function loadChatRoom(
  summary: ChatRoomSummary,
  currentUserId: string
): Promise<ChatRoom> {
  const [detail, latest] = await Promise.all([
    chatRoomApi.getRoom(summary.chatRoomIdx),
    chatRoomApi.getMessages(summary.chatRoomIdx, { size: 1 }),
  ]);
  const otherParticipants = detail.participants.filter(
    (participant) => participant.userId !== currentUserId
  );
  const directTarget =
    otherParticipants.find(
      (participant) => participant.userIdx === summary.targetUserIdx
    ) ?? otherParticipants[0];
  const latestMessage = latest.messages[0];

  return {
    id: `chat-${summary.chatRoomIdx}`,
    chatRoomIdx: summary.chatRoomIdx,
    targetUserIdx: summary.targetUserIdx ?? directTarget?.userIdx,
    name: summary.name,
    isGroup: false,
    members: detail.participants.map((participant) => ({
      id: String(participant.userIdx),
      nickname: participant.nickname,
      username: participant.userId,
      profileImage: participant.profileImageUrl ?? undefined,
    })),
    lastMessage:
      latestMessage?.type === "FILE"
        ? "파일"
        : latestMessage?.message ?? "",
    lastMessageTime: formatMessageTime(latestMessage?.createdAt),
    avatarUrl: summary.imageUrl ?? directTarget?.profileImageUrl ?? undefined,
  };
}

export default function FriendsPage() {
  const { selectedRoomId, setRooms } = useChatStore();
  const { user, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showSendMessage, setShowSendMessage] = useState(false);
  const [showRequests, setShowRequests] = useState(false);

  const loadChatRooms = useCallback(async () => {
    if (!user) return;
    const summaries = await chatRoomApi.getRooms();
    const dmSummaries = summaries.filter(
      (summary) => summary.roomType === "dm" && !!summary.targetUserIdx
    );
    const results = await Promise.allSettled(
      dmSummaries.map((summary) => loadChatRoom(summary, user.id))
    );
    setRooms(
      results
        .filter(
          (result): result is PromiseFulfilledResult<ChatRoom> =>
            result.status === "fulfilled"
        )
        .map((result) => result.value)
    );
  }, [setRooms, user]);

  useEffect(() => {
    if (!_hasHydrated || !user) return;
    let disposed = false;
    let loading = false;
    let firstRun = true;

    const run = async () => {
      if (disposed || loading) return;
      loading = true;
      try {
        await loadChatRooms();
      } catch {
        if (!disposed && firstRun) {
          toast.error("채팅방 목록을 불러오지 못했습니다.");
        }
      } finally {
        firstRun = false;
        loading = false;
      }
    };

    void run();
    const timer = window.setInterval(run, 10000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [_hasHydrated, user, loadChatRooms]);

  useEffect(() => {
    if (_hasHydrated && !user) {
      toast.error("로그인이 필요한 서비스입니다.");
      router.replace("/auth/login");
    }
  }, [_hasHydrated, user, router]);

  if (!_hasHydrated || !user) return null;

  return (
    <div className="flex h-[calc(100vh-62px)] overflow-hidden">
      <ChatSidebar
        onAddFriend={() => setShowAddFriend(true)}
        onNewMessage={() => setShowSendMessage(true)}
        onRequests={() => setShowRequests(true)}
      />

      {selectedRoomId ? (
        <ChatWindow />
      ) : (
        <EmptyChatView onSendMessage={() => setShowSendMessage(true)} />
      )}

      {showAddFriend && <AddFriendModal onClose={() => setShowAddFriend(false)} />}
      {showSendMessage && (
        <SendMessageModal
          onClose={() => setShowSendMessage(false)}
          onCreated={loadChatRooms}
        />
      )}
      {showRequests && (
        <FriendRequestsModal
          onClose={() => setShowRequests(false)}
          onChanged={() => undefined}
        />
      )}
    </div>
  );
}
