"use client";

import Image from "next/image";
import Link from "next/link";
import { DefaultProfile } from "@/assets";

interface Props {
  user: {
    profileImage?: string;
  };
}

export default function HeaderProfile({ user }: Props) {
  return (
    <Link href="/auth/profile">
      <div className="w-[41.31px] h-[41.31px] rounded-full overflow-hidden cursor-pointer">
        <Image
          src={user.profileImage || DefaultProfile}
          alt="프로필"
          width={36}
          height={36}
          className="w-full h-full object-cover"
        />
      </div>
    </Link>
  );
}
