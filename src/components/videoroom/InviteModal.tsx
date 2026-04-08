"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { INVITE_CANDIDATES } from "./mockData";

interface InviteModalProps {
  onClose: () => void;
}

export default function InviteModal({ onClose }: InviteModalProps) {
  const [search, setSearch] = useState("");
  const [invited, setInvited] = useState<Set<string>>(
    new Set(
      INVITE_CANDIDATES.filter((c) => c.invited).map((c) => c.id)
    )
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const filtered = INVITE_CANDIDATES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.username.toLowerCase().includes(search.toLowerCase())
  );

  const toggleInvite = (id: string) => {
    setInvited((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        role="dialog"
        aria-modal="true"
      >
        <div className="w-[380px] bg-white rounded-[15px] border border-[#E6E9EE] shadow-[0px_8px_17px_0px_rgba(0,0,0,0.2)] overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4">
            <h2 className="text-[18px] font-semibold text-[#333]">사용자 초대</h2>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center text-[#AAAAAA] hover:text-[#333] transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* 검색 */}
          <div className="px-6 pb-3">
            <div className="flex items-center gap-2 border border-[rgba(51,51,51,0.2)] rounded-[10px] px-3 h-[40px]">
              <Search size={15} className="text-[#AAAAAA] shrink-0" />
              <input
                type="text"
                placeholder="아이디"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 text-[13px] text-[#333] placeholder:text-[#AAAAAA] outline-none bg-transparent"
              />
            </div>
          </div>

          {/* 사용자 목록 */}
          <div className="px-4 max-h-[260px] overflow-y-auto flex flex-col gap-1">
            {filtered.map((candidate) => {
              const isInvited = invited.has(candidate.id);
              return (
                <div
                  key={candidate.id}
                  className="flex items-center gap-3 px-2 py-2.5 rounded-[10px] hover:bg-[#F5F5F5] transition-colors"
                >
                  {/* 아바타 */}
                  <div className="w-9 h-9 rounded-full bg-[#724BFD]/20 flex items-center justify-center shrink-0">
                    <span className="text-[13px] font-semibold text-[#724BFD]">
                      {candidate.name[0]}
                    </span>
                  </div>

                  {/* 이름 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#333] truncate">
                      {candidate.name}
                    </p>
                    <p className="text-[11px] text-[#AAAAAA] truncate">
                      @{candidate.username}
                    </p>
                  </div>

                  {/* 초대 버튼 */}
                  <button
                    onClick={() => toggleInvite(candidate.id)}
                    className={`shrink-0 h-[30px] px-3 rounded-[8px] text-[11px] font-medium transition-colors ${
                      isInvited
                        ? "bg-[#E8F5E9] text-[#4CAF50] border border-[#4CAF50]"
                        : "bg-[#724BFD] text-white hover:bg-[#5f3de0]"
                    }`}
                  >
                    {isInvited ? "완료" : "초대하기"}
                  </button>
                </div>
              );
            })}
          </div>

          {/* 완료 버튼 */}
          <div className="px-6 py-4">
            <button
              onClick={onClose}
              className="w-full h-[42px] bg-[#724BFD] text-white text-[14px] font-medium rounded-[10px] hover:bg-[#5f3de0] transition-colors"
            >
              완료
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
