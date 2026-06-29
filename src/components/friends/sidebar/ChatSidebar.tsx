"use client";

import { useState } from "react";
import { useChatStore } from "@/store/chatStore";
import ChatSearchBar from "./ChatSearchBar";
import ChatRoomItem from "./ChatRoomItem";

interface Props {
  onAddFriend: () => void;
  onNewMessage: () => void;
  onCreateRoom: () => void;
  onRequests: () => void;
}

export default function ChatSidebar({ onAddFriend, onNewMessage, onCreateRoom, onRequests }: Props) {
  const { rooms, selectedRoomId, selectRoom } = useChatStore();
  const [search, setSearch] = useState("");

  const filtered = rooms.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-[280px] shrink-0 flex flex-col border-r border-[#EEEEEE] bg-white h-full overflow-hidden">
      <ChatSearchBar
        value={search}
        onChange={setSearch}
        onAddFriend={onAddFriend}
        onNewMessage={onNewMessage}
        onCreateRoom={onCreateRoom}
        onRequests={onRequests}
      />
      <div className="flex-1 overflow-y-auto">
        {filtered.map((room) => (
          <ChatRoomItem
            key={room.id}
            room={room}
            isSelected={selectedRoomId === room.id}
            onClick={() => selectRoom(room.id)}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-[12px] text-[#AAAAAA] py-8">
            검색 결과가 없습니다.
          </p>
        )}
      </div>
    </div>
  );
}
