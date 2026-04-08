"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import NotificationModal from "./NotificationModal";

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        className={`transition-colors ${
          isOpen
            ? "text-[#724BFD]"
            : "text-[#333333] hover:text-[#724BFD]"
        }`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <Bell size={22} />
      </button>

      {isOpen && <NotificationModal onClose={() => setIsOpen(false)} />}
    </div>
  );
}
