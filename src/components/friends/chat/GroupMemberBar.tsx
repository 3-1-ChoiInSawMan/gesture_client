"use client";

import { ChatMember } from "../types";

interface Props {
  members: ChatMember[];
}

export default function GroupMemberBar({ members }: Props) {
  const text = members
    .map((m) => `${m.nickname}(@${m.username})`)
    .join(", ");

  // Split into two lines at roughly half
  const half = Math.ceil(members.length / 2);
  const line1 = members.slice(0, half).map((m) => `${m.nickname}(@${m.username})`).join(", ");
  const line2 = members.slice(half).map((m) => `${m.nickname}(@${m.username})`).join(", ");

  return (
    <div className="px-6 py-3 border-b border-[#EEEEEE] bg-[#FAFAFA]">
      <p className="text-[12px] text-[#666666] leading-relaxed">
        {line1}
        {line2 && <><br />{line2}</>}
      </p>
    </div>
  );
}
