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
import { friendApi } from "@/api/friendApi";
import { useDmChatSocket } from "./chat/useDmChatSocket";

export default function FriendsPage() {
  const { rooms, selectedRoomId, setRooms } = useChatStore();
  const { user, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showSendMessage, setShowSendMessage] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const sendDm = useDmChatSocket(user ? rooms : []);

  const loadFriends = useCallback(async () => {
    const friends = await friendApi.getFriends();
    setRooms(
      friends.map((friend) => ({
        id: `dm-${friend.idx}`,
        targetUserIdx: friend.idx,
        name: friend.nickname,
        isGroup: false,
        members: [{
          id: friend.id,
          nickname: friend.nickname,
          username: friend.id,
          profileImage: friend.profileImage,
        }],
        lastMessage: "",
        lastMessageTime: "",
        avatarUrl: friend.profileImage,
      }))
    );
  }, [setRooms]);

  useEffect(() => {
    if (!_hasHydrated || !user) return;
    void loadFriends().catch(() => toast.error("친구 목록을 불러오지 못했습니다."));
  }, [_hasHydrated, user, loadFriends]);

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
        <ChatWindow onSendDm={sendDm} />
      ) : (
        <EmptyChatView onSendMessage={() => setShowSendMessage(true)} />
      )}

      {showAddFriend && <AddFriendModal onClose={() => setShowAddFriend(false)} />}
      {showSendMessage && <SendMessageModal onClose={() => setShowSendMessage(false)} />}
      {showRequests && (
        <FriendRequestsModal
          onClose={() => setShowRequests(false)}
          onChanged={() => void loadFriends()}
        />
      )}
    </div>
  );
}
