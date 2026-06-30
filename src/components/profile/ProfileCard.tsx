"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DefaultProfile } from "@/assets";
import { User } from "@/store/authStore";
import { friendApi } from "@/api/friendApi";

interface Props {
  user: User;
}

export default function ProfileCard({ user }: Props) {
  const router = useRouter();
  const [friendCount, setFriendCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadFriendCount = async () => {
      try {
        const count = await friendApi.getCount();
        if (!cancelled) setFriendCount(count);
      } catch {
        try {
          const friends = await friendApi.getFriends();
          if (!cancelled) setFriendCount(friends.length);
        } catch {
          if (!cancelled) setFriendCount(0);
        }
      }
    };

    void loadFriendCount();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="w-full bg-[#F0EEFF] rounded-[20px] px-10 py-8 flex items-center justify-between relative">
      <div className="flex items-center gap-7">
        <div className="w-30 h-30 rounded-full overflow-hidden shrink-0">
          <Image
            src={user.profileImage || DefaultProfile}
            alt="프로필"
            width={120}
            height={120}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <p className="text-[28px] font-bold text-[#333333]">
            {user.nickname}{" "}
            <span className="text-[22px] font-semibold">({user.id})</span>
          </p>
          <p className="text-[15px] text-[#666666]">{user.email}</p>
          {user.statusMessage && (
            <p className="text-[15px] text-[#666666]">{user.statusMessage}</p>
          )}
          <button
            onClick={() => router.push("/auth/profile/edit")}
            className="mt-2 w-25 h-9 bg-[#724BFD] rounded-lg text-white text-[14px] font-semibold"
          >
            프로필 수정
          </button>
        </div>
      </div>

      <p
        className="absolute text-[13px] text-[#AAAAAA]"
        style={{ top: "17px", right: "28px" }}
      >
        가입일 {user.joinedAt}
      </p>

      <div className="flex items-center gap-8">
        <div className="w-px bg-[#D0C8F0]" style={{ height: "80px" }} />
        <div className="flex min-w-[72px] flex-col items-center">
          <p className="text-[28px] font-bold text-[#724BFD]">
            {friendCount ?? "-"}
          </p>
          <p className="text-[13px] text-[#666666]">친구</p>
        </div>
      </div>
    </div>
  );
}
