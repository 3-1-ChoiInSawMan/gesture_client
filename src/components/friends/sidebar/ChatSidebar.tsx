"use client";

import { useState } from "react";
import { useChatStore } from "@/store/chatStore";
import ChatSearchBar from "./ChatSearchBar";
import ChatRoomItem from "./ChatRoomItem";

interface Props {
  onAddFriend: () => void;
  onCreateRoom: () => void;
  isConnected?: boolean;
}

export default function ChatSidebar({ onAddFriend, onCreateRoom, isConnected }: Props) {
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
        onCreateRoom={onCreateRoom}
      />
      <div className="px-4 py-1.5 flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? "bg-green-400" : "bg-gray-300"}`} />
        <span className="text-[11px] text-[#AAAAAA]">{isConnected ? "서버 연결됨" : "연결 중..."}</span>
      </div>
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
