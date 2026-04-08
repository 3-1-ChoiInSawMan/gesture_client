"use client";

import { useAuthStore } from "@/store/authStore";

interface Props {
  onClose: () => void;
  onConfirm: () => void;
}

export default function LogoutModal({ onClose, onConfirm }: Props) {
  const { user } = useAuthStore();

  return (
    <>
      {/* 흑백 오버레이 */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-grayscale"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="bg-white rounded-2xl px-8 py-8 flex flex-col items-center gap-4 w-[340px] shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 프로필 이미지 */}
          <div className="w-12 h-12 rounded-full bg-[#E8E2FF] flex items-center justify-center overflow-hidden">
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt="프로필"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[#724BFD] font-bold text-lg">
                {user?.nickname?.[0] ?? "?"}
              </span>
            )}
          </div>

          {/* 텍스트 */}
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-[16px] font-bold text-[#333333]">
              계정에서 로그아웃하시겠습니까?
            </p>
            <p className="text-[13px] text-[#AAAAAA]">
              제스처를 사용하려면 다시 로그인해야 합니다.
            </p>
          </div>

          {/* 버튼 */}
          <div className="flex flex-col gap-2 w-full mt-1">
            <button
              className="w-full py-3 rounded-xl bg-red-400 text-white text-[14px] font-semibold hover:bg-red-500 transition-colors"
              onClick={onConfirm}
            >
              로그아웃
            </button>
            <button
              className="w-full py-3 rounded-xl border border-[#EEEEEE] text-[14px] text-[#333333] hover:bg-[#F5F5F5] transition-colors"
              onClick={onClose}
            >
              취소
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
