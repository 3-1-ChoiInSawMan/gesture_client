"use client";

import Image from "next/image";
import { ReactNode, useEffect, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { DefaultProfile } from "@/assets";
import { userApi, UserProfile } from "@/api/userApi";

interface Props {
  userIdx: number;
  onClose: () => void;
  footer?: ReactNode;
}

const formatJoinedAt = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

export default function UserProfileModal({ userIdx, onClose, footer }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    userApi.getUser(userIdx)
      .then((user) => {
        if (!cancelled) setProfile(user);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userIdx]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const joinedAt = formatJoinedAt(profile?.joinedAt || profile?.createdAt);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="사용자 프로필"
        className="w-full max-w-[560px] overflow-hidden rounded-[8px] bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-14 items-center justify-between border-b border-[#EEEEEE] px-6">
          <h2 className="text-[16px] font-bold text-[#333333]">프로필</h2>
          <button
            type="button"
            onClick={onClose}
            title="닫기"
            className="flex h-8 w-8 items-center justify-center text-[#999999] hover:text-[#333333]"
          >
            <X size={19} />
          </button>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <LoaderCircle className="animate-spin text-[#724BFD]" />
          </div>
        ) : error || !profile ? (
          <div className="flex h-64 items-center justify-center px-6 text-center text-[14px] text-[#888888]">
            프로필을 불러오지 못했습니다.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-6 bg-[#F3F0FF] px-8 py-8">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-white">
                <Image
                  src={profile.profileUrl || profile.profileImage || DefaultProfile}
                  alt={`${profile.nickname} 프로필`}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[24px] font-bold text-[#333333]">
                  {profile.nickname || profile.id}
                </p>
                <p className="mt-1 truncate text-[14px] text-[#777777]">
                  @{profile.id || profile.userId}
                </p>
                <p className="mt-4 min-h-5 whitespace-pre-wrap break-words text-[14px] text-[#555555]">
                  {profile.statusMessage || "상태 메시지가 없습니다."}
                </p>
              </div>
            </div>
            <div className="px-8 py-5">
              <p className="text-[12px] text-[#999999]">
                {joinedAt ? `가입일 ${joinedAt}` : "가입일 정보가 없습니다."}
              </p>
            </div>
          </>
        )}

        {footer && (
          <div className="flex justify-end gap-2 border-t border-[#EEEEEE] px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
