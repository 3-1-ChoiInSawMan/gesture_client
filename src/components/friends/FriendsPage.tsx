"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import ChatSidebar from "./sidebar/ChatSidebar";
import ChatWindow from "./chat/ChatWindow";
import EmptyChatView from "./EmptyChatView";
import AddFriendModal from "./modals/AddFriendModal";
import SendMessageModal from "./modals/SendMessageModal";
import CreateChatRoomModal from "./modals/CreateChatRoomModal";

export default function FriendsPage() {
  const { selectedRoomId } = useChatStore();
  const { user, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showSendMessage, setShowSendMessage] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);

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
        onCreateRoom={() => setShowCreateRoom(true)}
      />

      {selectedRoomId ? (
        <ChatWindow />
      ) : (
        <EmptyChatView onSendMessage={() => setShowSendMessage(true)} />
      )}

      {showAddFriend && <AddFriendModal onClose={() => setShowAddFriend(false)} />}
      {showSendMessage && <SendMessageModal onClose={() => setShowSendMessage(false)} />}
      {showCreateRoom && <CreateChatRoomModal onClose={() => setShowCreateRoom(false)} />}
    </div>
  );
}
