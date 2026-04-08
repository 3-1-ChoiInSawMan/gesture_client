"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import CallRoom, { CallRoomData } from "./CallRoom";
import { MOCK_ROOMS } from "./mockRooms";
import JoinRoomModal from "@/components/callroom/JoinRoomModal";
import JoinPrivateRoomModal from "@/components/callroom/JoinPrivateRoomModal";

interface Props {
  title: string;
  onClose: () => void;
  username: string;
}

export default function CallRoomFullView({ title, onClose, username }: Props) {
  const router = useRouter();
  const [selectedRoom, setSelectedRoom] = useState<CallRoomData | null>(null);

  const handleJoin = () => {
    if (!selectedRoom) return;
    router.push(`/room/${selectedRoom.id}`);
    setSelectedRoom(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[18px] font-bold text-[#333333]">{title}</p>
        <button
          onClick={onClose}
          className="flex items-center gap-0.5 text-[13px] text-[#724BFD] font-medium"
        >
          접기
          <ChevronRight size={15} className="text-[#724BFD] rotate-180" />
        </button>
      </div>
      <div className="grid grid-cols-5 gap-4">
        {MOCK_ROOMS.map((room) => (
          <CallRoom key={room.id} room={room} onClick={setSelectedRoom} />
        ))}
      </div>

      {selectedRoom && !selectedRoom.isPrivate && (
        <JoinRoomModal
          roomTitle={selectedRoom.title}
          isPrivate={false}
          onClose={() => setSelectedRoom(null)}
          onJoin={handleJoin}
        />
      )}
      {selectedRoom && selectedRoom.isPrivate && (
        <JoinPrivateRoomModal
          roomTitle={selectedRoom.title}
          onClose={() => setSelectedRoom(null)}
          onJoin={handleJoin}
        />
      )}
    </div>
  );
}
