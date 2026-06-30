"use client";

import { ChatRoom } from "../types";

interface Props {
  room: ChatRoom;
  isSelected: boolean;
  onClick: () => void;
}

function RoomAvatar({ room }: { room: ChatRoom }) {
  if (room.avatarUrl) {
    return (
      <img
        src={room.avatarUrl}
        alt={room.name}
        className="w-11 h-11 rounded-full object-cover shrink-0"
      />
    );
  }
  return (
    <div className="w-11 h-11 rounded-full bg-[#CCCCCC] flex items-center justify-center shrink-0 text-white text-[16px] font-bold">
      {room.name[0]}
    </div>
  );
}

export default function ChatRoomItem({ room, isSelected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`w-full min-w-0 overflow-hidden flex items-center gap-3 px-4 py-3 text-left transition-colors ${
        isSelected ? "bg-[#EDE9FF]" : "hover:bg-[#F5F5F5]"
      }`}
    >
      <RoomAvatar room={room} />
      <div className="flex-1 min-w-0">
        <div className="flex min-w-0 items-center justify-between">
          <p className="min-w-0 flex-1 text-[14px] font-semibold text-[#333333] truncate">{room.name}</p>
          <span className="text-[11px] text-[#AAAAAA] shrink-0 ml-2">{room.lastMessageTime}</span>
        </div>
        <p className="mt-0.5 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-[12px] text-[#888888]">{room.lastMessage}</p>
      </div>
    </button>
  );
}
