"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, UserRound, X } from "lucide-react";
import { friendApi, FriendRequest } from "@/api/friendApi";
import { userApi, UserProfile } from "@/api/userApi";
import { toast } from "react-toastify";

interface Props {
  onClose: () => void;
  onChanged: () => void;
}

export default function FriendRequestsModal({ onClose, onChanged }: Props) {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    friendApi.getRequests()
      .then(setRequests)
      .catch(() => toast.error("친구 요청을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  const process = async (request: FriendRequest, accept: boolean) => {
    setProcessing(request.friendshipIdx);
    try {
      if (accept) await friendApi.acceptRequest(request.friendshipIdx);
      else await friendApi.denyRequest(request.friendshipIdx);
      setRequests((current) =>
        current.filter((item) => item.friendshipIdx !== request.friendshipIdx)
      );
      onChanged();
      toast.success(accept ? "친구 요청을 수락했습니다." : "친구 요청을 거절했습니다.");
    } catch {
      toast.error("친구 요청 처리에 실패했습니다.");
    } finally {
      setProcessing(null);
    }
  };

  const openProfile = async (request: FriendRequest) => {
    try {
      setProfile(await userApi.getUser(request.userId || String(request.userIdx)));
    } catch {
      toast.error("프로필을 불러오지 못했습니다.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
      <div className="w-[480px] max-w-full max-h-[75vh] bg-white rounded-[8px] overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-[#EEEEEE] flex items-center justify-between">
          <p className="text-[16px] font-bold text-[#333333]">받은 친구 요청</p>
          <button onClick={onClose} title="닫기" className="w-8 h-8 flex items-center justify-center text-[#999999]"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto p-5">
          {loading ? (
            <div className="h-32 flex items-center justify-center"><LoaderCircle className="animate-spin text-[#724BFD]" /></div>
          ) : requests.length === 0 ? (
            <p className="py-12 text-center text-[13px] text-[#999999]">받은 친구 요청이 없습니다.</p>
          ) : requests.map((request) => (
            <div key={request.friendshipIdx} className="flex items-center gap-3 py-3 border-b border-[#EEEEEE] last:border-0">
              <button onClick={() => openProfile(request)} className="w-10 h-10 rounded-full bg-[#F0ECFF] flex items-center justify-center"><UserRound size={18} className="text-[#724BFD]" /></button>
              <button onClick={() => openProfile(request)} className="flex-1 min-w-0 text-left">
                <p className="text-[14px] font-semibold text-[#333333] truncate">{request.nickname || request.userId}</p>
                <p className="text-[12px] text-[#999999] truncate">@{request.userId}</p>
              </button>
              <button disabled={processing === request.friendshipIdx} onClick={() => process(request, false)} className="h-8 rounded-[6px] px-3 text-[12px] text-[#777777] disabled:opacity-50">거절</button>
              <button disabled={processing === request.friendshipIdx} onClick={() => process(request, true)} className="h-8 rounded-[6px] bg-[#724BFD] px-3 text-[12px] font-semibold text-white disabled:opacity-50">수락</button>
            </div>
          ))}
        </div>
      </div>
      {profile && (
        <div className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center px-4" onClick={() => setProfile(null)}>
          <div className="w-[360px] bg-white rounded-[8px] p-6" onClick={(event) => event.stopPropagation()}>
            <p className="text-[18px] font-bold text-[#333333]">{profile.nickname}</p>
            <p className="mt-1 text-[13px] text-[#888888]">@{profile.id || profile.userId}</p>
            <p className="mt-4 text-[13px] text-[#555555]">{profile.statusMessage || "상태 메시지가 없습니다."}</p>
          </div>
        </div>
      )}
    </div>
  );
}
