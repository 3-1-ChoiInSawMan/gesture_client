"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Search, X } from "lucide-react";
import { toast } from "react-toastify";
import { friendApi } from "@/api/friendApi";
import { userApi, UserProfile } from "@/api/userApi";
import { DefaultProfile } from "@/assets";
import { useAuthStore } from "@/store/authStore";

interface Props {
  onClose: () => void;
}

type SearchUser = UserProfile & { requestSent?: boolean; isFriend?: boolean };

export default function AddFriendModal({ onClose }: Props) {
  const currentUser = useAuthStore((state) => state.user);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const keyword = query.trim();
    if (!keyword) {
      const resetTimer = window.setTimeout(() => {
        setUsers([]);
        setLoading(false);
      }, 0);
      return () => window.clearTimeout(resetTimer);
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const [searchedUsers, friends] = await Promise.all([
          userApi.searchUser(keyword),
          friendApi.getFriends().catch(() => []),
        ]);
        if (cancelled) return;
        const friendIds = new Set(
          friends.flatMap((friend) => [friend.id, friend.userId]).filter(Boolean)
        );
        setUsers(
          searchedUsers
            .filter((user) => user.id !== currentUser?.id)
            .map((user) => ({
              ...user,
              isFriend: friendIds.has(user.id) || friendIds.has(user.userId),
            }))
        );
      } catch (err: unknown) {
        if (cancelled) return;
        const statusCode = (err as { response?: { data?: { statusCode?: string } } })
          ?.response?.data?.statusCode;
        if (statusCode === "USER_001") {
          setUsers([]);
        } else {
          toast.error("사용자 검색에 실패했습니다.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, currentUser?.id]);

  const sendFriendRequest = async (userIdx: number) => {
    setSendingId(userIdx);
    try {
      await friendApi.sendRequest(userIdx);
      setUsers((prev) =>
        prev.map((user) =>
          user.idx === userIdx ? { ...user, requestSent: true } : user
        )
      );
      toast.success("친구 요청을 보냈습니다.");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "친구 요청에 실패했습니다.";
      toast.error(message);
    } finally {
      setSendingId(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="flex h-[500px] w-full max-w-[440px] flex-col overflow-hidden rounded-[8px] bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-[#EEEEEE] px-6 py-5">
            <h2 className="text-[19px] font-bold text-[#333333]">친구 추가</h2>
            <button
              type="button"
              onClick={onClose}
              title="닫기"
              className="flex h-8 w-8 items-center justify-center text-[#999999] hover:text-[#333333]"
            >
              <X size={19} />
            </button>
          </div>

          <div className="px-6 py-4">
            <label htmlFor="friend-search" className="mb-2 block text-[13px] font-semibold text-[#333333]">
              사용자 아이디
            </label>
            <div className="relative">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AAAAAA]" />
              <input
                id="friend-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="아이디를 입력하세요"
                autoFocus
                className="h-11 w-full rounded-[6px] border border-[#DDDDDD] pl-11 pr-4 text-[14px] outline-none focus:border-[#724BFD]"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-4">
            {loading && (
              <p className="py-10 text-center text-[14px] text-[#999999]">검색 중...</p>
            )}
            {!loading && query.trim() && users.length === 0 && (
              <p className="py-10 text-center text-[14px] text-[#999999]">검색 결과가 없습니다.</p>
            )}
            {!loading && !query.trim() && (
              <p className="py-10 text-center text-[14px] text-[#999999]">친구로 추가할 사용자의 아이디를 검색하세요.</p>
            )}
            {!loading && users.map((user) => {
              const disabled =
                !user.idx ||
                user.isFriend ||
                user.requestSent ||
                sendingId === user.idx;
              const label = user.isFriend
                ? "친구"
                : user.requestSent
                  ? "요청됨"
                  : sendingId === user.idx
                    ? "전송 중"
                    : "친구 추가";
              return (
                <div key={user.idx ?? user.id} className="flex items-center gap-3 border-b border-[#F0F0F0] py-3 last:border-0">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#EEEEEE]">
                    <Image
                      src={user.profileUrl || user.profileImage || DefaultProfile}
                      alt="프로필"
                      width={44}
                      height={44}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-[#333333]">{user.nickname}</p>
                    <p className="truncate text-[12px] text-[#999999]">@{user.id || user.userId}</p>
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => sendFriendRequest(Number(user.idx))}
                    className="h-9 rounded-[6px] bg-[#724BFD] px-4 text-[13px] font-semibold text-white hover:bg-[#5F3DE0] disabled:bg-[#EEEEEE] disabled:text-[#999999]"
                  >
                    {label}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
