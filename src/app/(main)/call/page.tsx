"use client";

import { useState } from "react";
import CallRoomSection from "@/components/home/CallRoomSection";
import CallRoomFullView from "@/components/home/CallRoomFullView";
import useProfile from "@/hooks/useProfile";

type FullViewSection = "live" | null;

export default function CallPage() {
  const [fullView, setFullView] = useState<FullViewSection>(null);
  const { getProfile } = useProfile();
  const userName = getProfile()?.nickname ?? "";

  return (
    <div className="w-full min-h-screen bg-white">
      <div className="max-w-300 mx-auto px-6 py-8 flex flex-col gap-10">
        {fullView ? (
          <CallRoomFullView
            title="지금 진행 중인 영상 통화에 참여해보세요"
            onClose={() => setFullView(null)}
            username={userName}
          />
        ) : (
          <CallRoomSection
            title="지금 진행 중인 영상 통화에 참여해보세요"
            onViewAll={() => setFullView("live")}
            rows={3}
            username={userName}
            showFilter
          />
        )}
      </div>
    </div>
  );
}
