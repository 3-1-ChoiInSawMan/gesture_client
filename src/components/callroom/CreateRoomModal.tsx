"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, Minus, Plus, X } from "lucide-react";
import Image from "next/image";
import { toast } from "react-toastify";
import { callRoomApi } from "@/api/callRoomApi";
import { useCallRoomStore } from "@/store/callRoomStore";

const CATEGORY_MAP = {
  "일반": "BASIC",
  "회의방": "MEETING",
  "스터디": "STUDY",
} as const;

type RoomType = keyof typeof CATEGORY_MAP;

export interface CreateRoomFormData {
  roomName: string;
  description: string;
  visibility: "공개" | "비공개";
  roomType: RoomType;
  maxParticipants: number;
  thumbnailFile?: File;
}

interface CreateRoomModalProps {
  onClose: () => void;
  onSubmit?: (data: CreateRoomFormData) => void;
}

function ImageUploadArea({
  preview,
  isDragging,
  onDrop,
  onDragOver,
  onDragLeave,
  onAreaClick,
  onFileChange,
  onClearPreview,
  fileInputRef,
}: {
  preview: string | null;
  isDragging: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onAreaClick: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearPreview: (e: React.MouseEvent) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div
      className={`w-full h-[160px] rounded-[15px] border-2 border-dashed bg-[#F3F4F6] flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
        isDragging ? "border-[#724BFD] bg-purple-50" : "border-[#E6E9EE]"
      }`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={onAreaClick}
    >
      {preview ? (
        <div className="relative w-full h-full rounded-[13px] overflow-hidden">
          <Image src={preview} alt="썸네일 미리보기" fill className="object-cover" unoptimized />
          <button
            className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
            onClick={onClearPreview}
            aria-label="이미지 제거"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <>
          <div className="w-[48px] h-[48px] bg-white border border-[#E6E9EE] rounded-full flex items-center justify-center">
            <Upload size={20} className="text-[#724BFD]" strokeWidth={2} />
          </div>
          <p className="text-[12px] font-semibold text-[#333] tracking-tight select-none">
            이미지를 드래그하여 업로드
          </p>
          <div
            className="bg-white border border-[#E6E9EE] rounded-[5px] px-[14px] py-[7px] text-[12px] font-semibold text-[#333] hover:bg-gray-50 transition-colors"
            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
          >
            파일선택
          </div>
        </>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
    </div>
  );
}

function VisibilityToggle({ value, onChange }: { value: "공개" | "비공개"; onChange: (v: "공개" | "비공개") => void }) {
  return (
    <div className="flex gap-[10px]">
      {(["공개", "비공개"] as const).map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`h-[36px] px-[16px] rounded-[23px] text-[12px] font-medium tracking-[0.36px] transition-colors ${
            value === option ? "bg-[#724BFD] text-white" : "border border-[#E6E9EE] text-[#333] hover:bg-gray-50"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function RoomTypeToggle({ value, onChange }: { value: RoomType; onChange: (v: RoomType) => void }) {
  return (
    <div className="flex gap-[7px]">
      {(["일반", "회의방", "스터디"] as const).map((type) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className={`h-[36px] px-[14px] rounded-[23px] text-[12px] font-medium tracking-[0.36px] transition-colors ${
            value === type ? "bg-[#724BFD] text-white" : "border border-[#E6E9EE] text-[#333] hover:bg-gray-50"
          }`}
        >
          {type}
        </button>
      ))}
    </div>
  );
}

function ParticipantCounter({ value, onDecrease, onIncrease }: { value: number; onDecrease: () => void; onIncrease: () => void }) {
  return (
    <div className="w-[160px] h-[36px] bg-[#F3F4F6] rounded-[12px] flex items-center justify-center gap-[10px] px-[16px]">
      <button
        onClick={onDecrease}
        className="w-[18px] h-[18px] bg-white rounded-[8px] flex items-center justify-center hover:bg-gray-100 transition-colors shrink-0"
      >
        <Minus size={9} className="text-black" strokeWidth={2.5} />
      </button>
      <div className="w-[54px] h-[26px] bg-white rounded-[5px] flex items-center justify-center shrink-0">
        <span className="text-[12px] font-medium text-black tracking-[0.36px]">{value}</span>
      </div>
      <button
        onClick={onIncrease}
        className="w-[18px] h-[18px] bg-white rounded-[8px] flex items-center justify-center hover:bg-gray-100 transition-colors shrink-0"
      >
        <Plus size={9} className="text-black" strokeWidth={2.5} />
      </button>
    </div>
  );
}

export default function CreateRoomModal({ onClose, onSubmit }: CreateRoomModalProps) {
  const { fetchRooms } = useCallRoomStore();
  const router = useRouter();
  const [roomName, setRoomName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"공개" | "비공개">("공개");
  const [roomType, setRoomType] = useState<RoomType>("회의방");
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [pwDigits, setPwDigits] = useState(["", "", "", ""]);
  const pwRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePwChange = (i: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...pwDigits];
    next[i] = value;
    setPwDigits(next);
    if (value && i < 3) pwRefs.current[i + 1]?.focus();
  };

  const handlePwKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pwDigits[i] && i > 0) {
      pwRefs.current[i - 1]?.focus();
    }
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSubmit = async () => {
    if (!roomName.trim()) {
      toast.error("방 이름을 입력해주세요.");
      return;
    }
    if (!description.trim()) {
      toast.error("방 설명을 입력해주세요.");
      return;
    }
    if (visibility === "비공개" && pwDigits.some((d) => !d)) {
      toast.error("비밀번호 4자리를 모두 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      let thumbnailUrl: string | undefined;
      if (thumbnailFile) {
        thumbnailUrl = await toBase64(thumbnailFile);
      }

      const result = await callRoomApi.createRoom({
        title: roomName,
        description: description.trim(),
        maxParticipant: maxParticipants,
        isPublic: visibility === "공개",
        category: CATEGORY_MAP[roomType],
        ...(visibility === "비공개" ? { password: pwDigits.join("") } : {}),
        ...(thumbnailUrl ? { thumbnailUrl } : {}),
      });

      toast.success("방이 생성되었습니다.");
      onSubmit?.({ roomName, description, visibility, roomType, maxParticipants, thumbnailFile: thumbnailFile ?? undefined });
      onClose();

      const roomId = result.roomId ?? result.roomIdx;
      if (roomId != null) {
        // 방 생성자 표시: sendLeaveBeacon에서 삭제 vs 나가기 결정에 사용
        localStorage.setItem("host_call_room_id", String(roomId));
        sessionStorage.setItem("currentRoomId", String(roomId));
        router.push("/room");
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "방 생성에 실패했습니다.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
        <div className="w-[600px] bg-white rounded-[15px] border border-[#E6E9EE] shadow-[0px_8px_17px_0px_rgba(0,0,0,0.2)] px-[55px] py-[28px] flex flex-col gap-4">

          <h2 className="text-[24px] font-semibold text-black text-center tracking-[0.9px]">
            통화방 생성하기
          </h2>

          <ImageUploadArea
            preview={thumbnailPreview}
            isDragging={isDragging}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onAreaClick={() => fileInputRef.current?.click()}
            onFileChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            onClearPreview={(e) => { e.stopPropagation(); setThumbnailPreview(null); setThumbnailFile(null); }}
            fileInputRef={fileInputRef}
          />

          {/* 방 이름 */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-[#333]">
              방 이름 <span className="text-[#F85858]">*</span>
            </label>
            <input
              type="text"
              autoComplete="off"
              placeholder="방 이름"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full h-[40px] border border-[rgba(51,51,51,0.3)] rounded-[12px] px-[16px] text-[14px] text-[#333] placeholder:text-[rgba(51,51,51,0.5)] outline-none focus:border-[#724BFD] transition-colors"
            />
          </div>

          {/* 방 설명 */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-[#333]">
              방 설명 <span className="text-[#F85858]">*</span>
            </label>
            <input
              type="text"
              autoComplete="off"
              placeholder="방에 대한 간단한 설명을 입력해주세요"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-[40px] border border-[rgba(51,51,51,0.3)] rounded-[12px] px-[16px] text-[14px] text-[#333] placeholder:text-[rgba(51,51,51,0.5)] outline-none focus:border-[#724BFD] transition-colors"
            />
          </div>

          {/* 공개 범위 + 방 유형 */}
          <div className="flex">
            <div className="flex flex-col gap-2 w-[260px]">
              <label className="text-[13px] font-semibold text-[#333]">
                공개 범위 설정 <span className="text-[#F85858]">*</span>
              </label>
              <VisibilityToggle value={visibility} onChange={(v) => { setVisibility(v); setPwDigits(["", "", "", ""]); }} />
            </div>
            <div className="flex flex-col gap-2 w-[230px]">
              <label className="text-[13px] font-semibold text-[#333]">
                방 유형 설정 <span className="text-[#F85858]">*</span>
              </label>
              <RoomTypeToggle value={roomType} onChange={setRoomType} />
            </div>
          </div>

          {/* 최대 인원 + 비밀번호 (비공개 시) */}
          <div className="flex items-end">
            <div className="flex flex-col gap-2 w-[260px]">
              <label className="text-[13px] font-semibold text-[#333]">
                최대 인원 수 <span className="text-[#F85858]">*</span>
              </label>
              <ParticipantCounter
                value={maxParticipants}
                onDecrease={() => setMaxParticipants((p) => Math.max(2, p - 1))}
                onIncrease={() => setMaxParticipants((p) => Math.min(100, p + 1))}
              />
            </div>
            {visibility === "비공개" && (
              <div className="flex flex-col gap-2">
                <label className="text-[13px] font-semibold text-[#333]">
                  비밀번호 <span className="text-[#F85858]">*</span>
                </label>
                <div className="flex gap-2">
                  {pwDigits.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => { pwRefs.current[i] = el; }}
                      type="text"
                      autoComplete="off"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePwChange(i, e.target.value)}
                      onKeyDown={(e) => handlePwKeyDown(i, e)}
                      className="w-[36px] h-[36px] border border-[rgba(51,51,51,0.3)] rounded-[10px] text-center text-[16px] font-semibold text-[#333] outline-none focus:border-[#724BFD] transition-colors"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 버튼 */}
          <div className="flex gap-[40px] mt-1">
            <button
              onClick={onClose}
              className="flex-1 h-[42px] bg-[#F3F4F6] text-[#333] text-[14px] font-medium rounded-[10px] hover:bg-[#E9EAEC] transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 h-[42px] bg-[#724BFD] text-white text-[14px] font-medium rounded-[10px] hover:bg-[#5f3de0] transition-colors disabled:opacity-40"
            >
              {submitting ? "생성 중..." : "생성"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
