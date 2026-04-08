"use client";

import { useState } from "react";
import Banner from "@/components/home/Banner";
import CallRoomSection from "@/components/home/CallRoomSection";
import CallRoomFullView from "@/components/home/CallRoomFullView";
import useProfile from "@/hooks/useProfile";

type FullViewSection = "live" | "recent" | "popular" | "friends" | null;

const sections: { key: FullViewSection; title: string }[] = [
  { key: "live", title: "지금 진행 중인 영상 통화에 참여해보세요" },
  { key: "recent", title: "최근 참여한 통화방" },
  { key: "popular", title: "지금 가장 인기 있는 통화방" },
  { key: "friends", title: "친구들이 참여 중인 통화방" },
];

export default function HomePage() {
  const [fullView, setFullView] = useState<FullViewSection>(null);
  const { getProfile } = useProfile();
  const userName = getProfile()?.nickname ?? "";

  const handleViewAll = (key: FullViewSection) => {
    setFullView(key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClose = () => {
    setFullView(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="w-full min-h-screen bg-white">
      <div className="max-w-300 mx-auto px-6 py-8 flex flex-col gap-10">
        <Banner />

        {fullView ? (
          <CallRoomFullView
            title={sections.find((s) => s.key === fullView)?.title ?? ""}
            onClose={handleClose}
            username={userName}
          />
        ) : (
          <>
            {sections.map((s) => (
              <CallRoomSection
                key={s.key}
                title={s.title}
                onViewAll={() => handleViewAll(s.key)}
                rows={s.key === "live" ? 2 : 1}
                username={userName}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
