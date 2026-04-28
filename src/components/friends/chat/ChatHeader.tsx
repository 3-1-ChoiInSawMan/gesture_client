"use client";

import { ChatRoom } from "../types";

interface Props {
  room: ChatRoom;
}

function RoomAvatar({ room }: { room: ChatRoom }) {
  if (room.avatarUrl) {
    return (
      <img
        src={room.avatarUrl}
        alt={room.name}
        className="w-10 h-10 rounded-full object-cover"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-full bg-[#CCCCCC] flex items-center justify-center text-white text-[16px] font-bold">
      {room.name[0]}
    </div>
  );
}

export default function ChatHeader({ room }: Props) {
  return (
    <div className="flex items-center gap-3 px-6 py-4 border-b border-[#EEEEEE] bg-white">
      <RoomAvatar room={room} />
      <div>
        <p className="text-[16px] font-bold text-[#333333]">{room.name}</p>
        {room.isGroup && (
          <p className="text-[12px] text-[#AAAAAA]">{room.members.length}명</p>
        )}
      </div>
    </div>
  );
}
