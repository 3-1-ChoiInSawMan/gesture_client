"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import SearchInput from "@/components/header/SearchInput";
import HeaderProfile from "@/components/header/HeaderProfile";
import NotificationBell from "@/components/header/NotificationBell";
import { Menu, UserCircle } from "lucide-react";

export default function Header() {
  const { user } = useAuthStore();

  return (
    <div className="fixed top-0 left-0 right-0 z-20 h-15.5 flex items-center justify-between bg-white px-0">
      <div className="flex items-center ml-6 gap-4">
        <Menu size={22} className="text-[#333333] cursor-pointer" />
        <Link href="/">
          <div
            className="flex items-center cursor-pointer"
            style={{ marginLeft: "92px" }}
          >
            <h1 className="ml-3 font-extrabold text-[30px] text-[#724BFD]">
              제스처
            </h1>
          </div>
        </Link>
      </div>

      {user ? (
        <div className="flex items-center gap-8 mr-10">
          <SearchInput />
          <NotificationBell />
          <HeaderProfile user={user} />
        </div>
      ) : (
        <Link href="/auth/login" className="mr-10">
          <UserCircle size={32} className="text-[#724BFD] hover:text-[#5f3de0] transition-colors cursor-pointer" />
        </Link>
      )}
    </div>
  );
}
