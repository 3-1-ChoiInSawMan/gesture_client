"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Pencil, X } from "lucide-react";
import Image from "next/image";
import { toast } from "react-toastify";

interface RoomSettingsModalProps {
  roomTitle: string;
  isPrivate: boolean;
  currentCode?: string;
  onClose: () => void;
  onSave: (data: { roomName: string; isPrivate: boolean; code: string }) => void;
}

export default function RoomSettingsModal({
  roomTitle,
  isPrivate,
  currentCode = "",
  onClose,
  onSave,
}: RoomSettingsModalProps) {
  const [roomName, setRoomName] = useState(roomTitle);
  const [isPrivateMode, setIsPrivateMode] = useState(isPrivate);
  const [code, setCode] = useState(currentCode);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setThumbnailPreview(url);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleSave = () => {
    if (!roomName.trim()) {
      toast.error("방 이름을 입력해주세요.");
      return;
    }
    if (isPrivateMode && code.length < 4) {
      toast.error("비공개 방은 4자리 참여 코드를 입력해주세요.");
      return;
    }
    onSave({ roomName, isPrivate: isPrivateMode, code });
    toast.success("방 설정이 저장되었습니다.");
    onClose();
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
        <div className="w-[420px] bg-white rounded-[15px] border border-[#E6E9EE] shadow-[0px_8px_17px_0px_rgba(0,0,0,0.2)] px-[40px] py-[28px] flex flex-col gap-4">
          <h2 className="text-[20px] font-semibold text-black text-center tracking-tight">
            통화방 설정
          </h2>

          {/* 썸네일 */}
          <div className="flex justify-center">
            <div className="relative w-[120px] h-[80px] rounded-[10px] overflow-hidden bg-[#F3F4F6] cursor-pointer group">
              {thumbnailPreview ? (
                <Image
                  src={thumbnailPreview}
                  alt="방 썸네일"
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div
                  className="w-full h-full"
                  style={{
                    background: "linear-gradient(135deg, #1a2a4a, #2d1a4a)",
                  }}
                />
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-1.5 right-1.5 w-6 h-6 bg-[#724BFD] rounded-full flex items-center justify-center hover:bg-[#5f3de0] transition-colors"
              >
                <Pencil size={11} className="text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* 방 이름 */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-[#333]">
              방 이름
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full h-[40px] border border-[rgba(51,51,51,0.3)] rounded-[12px] px-[16px] text-[14px] text-[#333] outline-none focus:border-[#724BFD] transition-colors"
            />
          </div>

          {/* 공개 범위 + 참여 코드 */}
          <div className="flex items-end gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[13px] font-semibold text-[#333]">
                공개 범위
              </label>
              <div className="flex gap-2">
                {(["공개", "비공개"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setIsPrivateMode(opt === "비공개")}
                    className={`h-[36px] px-[16px] rounded-[23px] text-[12px] font-medium transition-colors ${
                      (opt === "비공개") === isPrivateMode
                        ? "bg-[#724BFD] text-white"
                        : "border border-[#E6E9EE] text-[#333] hover:bg-gray-50"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {isPrivateMode && (
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-semibold text-[#333]">
                  참여 코드(4자리 숫자)
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 4))
                  }
                  className="w-[100px] h-[36px] border border-[rgba(51,51,51,0.3)] rounded-[10px] px-[12px] text-[14px] text-[#333] outline-none focus:border-[#724BFD] transition-colors"
                  placeholder="1234"
                />
              </div>
            )}
          </div>

          {/* 버튼 */}
          <div className="flex gap-4 mt-1">
            <button
              onClick={onClose}
              className="flex-1 h-[42px] bg-[#F3F4F6] text-[#333] text-[14px] font-medium rounded-[10px] hover:bg-[#E9EAEC] transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="flex-1 h-[42px] bg-[#724BFD] text-white text-[14px] font-medium rounded-[10px] hover:bg-[#5f3de0] transition-colors"
            >
              완료
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
