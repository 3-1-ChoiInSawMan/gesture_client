"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Video, Users } from "lucide-react";

const menus = [
  { href: "/", icon: Home, label: "홈" },
  { href: "/call", icon: Video, label: "통화" },
  { href: "/friends", icon: Users, label: "친구" },
];

export default function SideBar() {
  const pathname = usePathname();

  return (
    <div className="fixed left-0 top-0 w-18 h-screen flex flex-col items-center pt-15.5 bg-white z-10">
      <div className="flex flex-col items-center gap-8 mt-8">
        {menus.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href}>
            <div
              className={`flex flex-col items-center gap-1 cursor-pointer ${pathname === href ? "text-[#724BFD]" : "text-[#AAAAAA]"}`}
            >
              <Icon size={24} />
              <span className="text-[11px] font-medium">{label}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
