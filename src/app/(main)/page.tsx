"use client";

import { useRouter } from "next/navigation";
import Banner from "@/components/home/Banner";
import CallRoomSection from "@/components/home/CallRoomSection";
import useProfile from "@/hooks/useProfile";

export default function HomePage() {
  const router = useRouter();
  const { getProfile } = useProfile();
  const userName = getProfile()?.nickname ?? "";

  return (
    <div className="w-full min-h-screen bg-white">
      <div className="max-w-300 mx-auto px-6 py-8 flex flex-col gap-10">
        <Banner />

        <CallRoomSection
          title="지금 진행 중인 통화방"
          onViewAll={() => router.push("/call?sort=createdAt,desc")}
          rows={2}
          username={userName}
          defaultSort="createdAt,desc"
        />

        <CallRoomSection
          title="지금 가장 인기 있는 통화방"
          onViewAll={() => router.push("/call?sort=maxParticipant,desc")}
          rows={2}
          username={userName}
          defaultSort="maxParticipant,desc"
        />
      </div>
    </div>
  );
}
