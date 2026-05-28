"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CallRoomSection from "@/components/home/CallRoomSection";
import useProfile from "@/hooks/useProfile";

function CallPageContent() {
  const { getProfile } = useProfile();
  const userName = getProfile()?.nickname ?? "";
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("q") ?? "";
  const sortParam = searchParams.get("sort") ?? "createdAt,desc";

  return (
    <div className="w-full min-h-screen bg-white">
      <div className="max-w-300 mx-auto px-6 py-8 flex flex-col gap-10">
        <CallRoomSection
          title={searchQuery ? `"${searchQuery}" 검색 결과` : "지금 진행 중인 영상 통화에 참여해보세요"}
          rows={4}
          username={userName}
          showFilter={!searchQuery}
          showPagination={true}
          defaultSort={sortParam}
          searchQuery={searchQuery}
        />
      </div>
    </div>
  );
}

export default function CallPage() {
  return (
    <Suspense>
      <CallPageContent />
    </Suspense>
  );
}
