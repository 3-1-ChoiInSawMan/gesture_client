"use client";

import { useState } from "react";
import { useChatStore } from "@/store/chatStore";
import { useSocketChat } from "@/hooks/useSocketChat";
import ChatSidebar from "./sidebar/ChatSidebar";
import ChatWindow from "./chat/ChatWindow";
import EmptyChatView from "./EmptyChatView";
import AddFriendModal from "./modals/AddFriendModal";
import SendMessageModal from "./modals/SendMessageModal";
import CreateChatRoomModal from "./modals/CreateChatRoomModal";

export default function FriendsPage() {
  const { selectedRoomId } = useChatStore();
  const { isConnected } = useSocketChat();
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showSendMessage, setShowSendMessage] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);

  return (
    <div className="flex h-[calc(100vh-62px)] overflow-hidden">
      <ChatSidebar
        onAddFriend={() => setShowAddFriend(true)}
        onCreateRoom={() => setShowCreateRoom(true)}
        isConnected={isConnected}
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
