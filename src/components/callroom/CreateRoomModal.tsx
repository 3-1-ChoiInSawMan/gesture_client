"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Minus, Plus, X } from "lucide-react";
import Image from "next/image";
import { toast } from "react-toastify";
import { callRoomApi } from "@/api/callRoomApi";
import { useCallRoomStore } from "@/store/callRoomStore";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

export interface CreateRoomFormData {
  roomName: string;
  visibility: "공개" | "비공개";
  participationCode: string;
  roomType: "일반" | "회의방" | "스터디";
  maxParticipants: number;
  thumbnailFile?: File;
}

interface CreateRoomModalProps {
  onClose: () => void;
  onSubmit?: (data: CreateRoomFormData) => void;
}

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

/** 이미지 드래그&드롭 / 파일 선택 업로드 영역 */
interface ImageUploadAreaProps {
  preview: string | null;
  isDragging: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onAreaClick: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearPreview: (e: React.MouseEvent) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
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
}: ImageUploadAreaProps) {
  return (
    <div
      className={`w-full h-[180px] rounded-[15px] border-2 border-dashed bg-[#F3F4F6] flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
        isDragging ? "border-[#724BFD] bg-purple-50" : "border-[#E6E9EE]"
      }`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={onAreaClick}
    >
      {preview ? (
        /* 이미지 미리보기 */
        <div className="relative w-full h-full rounded-[13px] overflow-hidden">
          <Image
            src={preview}
            alt="썸네일 미리보기"
            fill
            className="object-cover"
            unoptimized
          />
          {/* 미리보기 제거 버튼 */}
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
          {/* 업로드 아이콘 */}
          <div className="w-[48px] h-[48px] bg-white border border-[#E6E9EE] rounded-full flex items-center justify-center">
            <Upload size={20} className="text-[#724BFD]" strokeWidth={2} />
          </div>

          {/* 안내 텍스트 */}
          <p className="text-[12px] font-semibold text-[#333] tracking-tight select-none">
            이미지를 드래그하여 업로드
          </p>

          {/* 파일 선택 버튼 */}
          <div
            className="bg-white border border-[#E6E9EE] rounded-[5px] px-[14px] py-[7px] text-[12px] font-semibold text-[#333] hover:bg-gray-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            파일선택
          </div>
        </>
      )}

      {/* 숨겨진 파일 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  );
}

/** 공개/비공개 토글 버튼 그룹 */
interface VisibilityToggleProps {
  value: "공개" | "비공개";
  onChange: (v: "공개" | "비공개") => void;
}

function VisibilityToggle({ value, onChange }: VisibilityToggleProps) {
  return (
    <div className="flex gap-[10px]">
      {(["공개", "비공개"] as const).map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={`h-[36px] px-[16px] rounded-[23px] text-[12px] font-medium tracking-[0.36px] transition-colors ${
            value === option
              ? "bg-[#724BFD] text-white"
              : "border border-[#E6E9EE] text-[#333] hover:bg-gray-50"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

/** 일반/회의방/스터디 토글 버튼 그룹 */
interface RoomTypeToggleProps {
  value: "일반" | "회의방" | "스터디";
  onChange: (v: "일반" | "회의방" | "스터디") => void;
}

function RoomTypeToggle({ value, onChange }: RoomTypeToggleProps) {
  return (
    <div className="flex gap-[7px]">
      {(["일반", "회의방", "스터디"] as const).map((type) => (
        <button
          key={type}
          onClick={() => onChange(type)}
          className={`h-[36px] px-[14px] rounded-[23px] text-[12px] font-medium tracking-[0.36px] transition-colors ${
            value === type
              ? "bg-[#724BFD] text-white"
              : "border border-[#E6E9EE] text-[#333] hover:bg-gray-50"
          }`}
        >
          {type}
        </button>
      ))}
    </div>
  );
}

/** 최대 인원 수 카운터 (- / 숫자 / +) */
interface ParticipantCounterProps {
  value: number;
  onDecrease: () => void;
  onIncrease: () => void;
}

function ParticipantCounter({
  value,
  onDecrease,
  onIncrease,
}: ParticipantCounterProps) {
  return (
    <div className="w-[160px] h-[36px] bg-[#F3F4F6] rounded-[12px] flex items-center justify-center gap-[10px] px-[16px]">
      {/* 감소 버튼 */}
      <button
        onClick={onDecrease}
        className="w-[18px] h-[18px] bg-white rounded-[8px] flex items-center justify-center hover:bg-gray-100 transition-colors shrink-0"
        aria-label="인원 감소"
      >
        <Minus size={9} className="text-black" strokeWidth={2.5} />
      </button>

      {/* 현재 값 표시 */}
      <div className="w-[54px] h-[26px] bg-white rounded-[5px] flex items-center justify-center shrink-0">
        <span className="text-[12px] font-medium text-black tracking-[0.36px]">
          {value}
        </span>
      </div>

      {/* 증가 버튼 */}
      <button
        onClick={onIncrease}
        className="w-[18px] h-[18px] bg-white rounded-[8px] flex items-center justify-center hover:bg-gray-100 transition-colors shrink-0"
        aria-label="인원 증가"
      >
        <Plus size={9} className="text-black" strokeWidth={2.5} />
      </button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────

export default function CreateRoomModal({
  onClose,
  onSubmit,
}: CreateRoomModalProps) {
  const { fetchRooms } = useCallRoomStore();
  // ── 폼 상태 ──────────────────────────────────────────────
  const [roomName, setRoomName] = useState("");
  const [visibility, setVisibility] = useState<"공개" | "비공개">("공개");
  const [participationCode, setParticipationCode] = useState("");
  const [roomType, setRoomType] = useState<"일반" | "회의방" | "스터디">(
    "회의방"
  );
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [submitting, setSubmitting] = useState(false);

  // ── 모달 오픈 시 body 스크롤 잠금 ───────────────────────
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // ── 이미지 업로드 상태 ───────────────────────────────────
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── 이미지 핸들러 ────────────────────────────────────────

  /** 파일 객체를 받아 미리보기 URL 생성 */
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setThumbnailPreview(url);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleClearPreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setThumbnailPreview(null);
  };

  // ── 인원 수 핸들러 ───────────────────────────────────────
  const decreaseParticipants = () =>
    setMaxParticipants((prev) => Math.max(2, prev - 1));
  const increaseParticipants = () =>
    setMaxParticipants((prev) => Math.min(100, prev + 1));

  // ── 제출 핸들러 ──────────────────────────────────────────
  const handleSubmit = async () => {
    if (!roomName.trim()) {
      toast.error("방 이름을 입력해주세요.");
      return;
    }
    if (visibility === "비공개" && !participationCode.trim()) {
      toast.error("비공개 방은 참여 코드를 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await callRoomApi.createRoom({
        title: roomName,
        maxParticipant: maxParticipants,
        isPublic: visibility === "공개",
        description: participationCode || undefined,
      });
      onSubmit?.({
        roomName,
        visibility,
        participationCode,
        roomType,
        maxParticipants,
      });
      toast.success("방이 생성되었습니다.");
      await fetchRooms();
      onClose();
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
      {/* ── 배경 오버레이 ──────────────────────────────────── */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── 모달 컨테이너 ──────────────────────────────────── */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-room-title"
      >
        <div className="w-[600px] bg-white rounded-[15px] border border-[#E6E9EE] shadow-[0px_8px_17px_0px_rgba(0,0,0,0.2)] px-[55px] py-[28px] flex flex-col gap-4">

          {/* ── 제목 ─────────────────────────────────────────── */}
          <h2
            id="create-room-title"
            className="text-[24px] font-semibold text-black text-center tracking-[0.9px]"
          >
            통화방 생성하기
          </h2>

          {/* ── 이미지 업로드 영역 ───────────────────────────── */}
          <ImageUploadArea
            preview={thumbnailPreview}
            isDragging={isDragging}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={() => setIsDragging(false)}
            onAreaClick={() => fileInputRef.current?.click()}
            onFileChange={handleFileChange}
            onClearPreview={handleClearPreview}
            fileInputRef={fileInputRef}
          />

          {/* ── 방 이름 ──────────────────────────────────────── */}
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-[#333]">
              방 이름 <span className="text-[#F85858]">*</span>
            </label>
            <input
              type="text"
              placeholder="방 이름"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="w-full h-[40px] border border-[rgba(51,51,51,0.3)] rounded-[12px] px-[16px] text-[14px] text-[#333] placeholder:text-[rgba(51,51,51,0.5)] tracking-[0.45px] outline-none focus:border-[#724BFD] transition-colors"
            />
          </div>

          {/* ── 공개 범위 설정 + 참여 코드 ──────────────────── */}
          {/* 왼쪽(260px): 공개 범위 토글 / 오른쪽(230px): 참여 코드 입력 */}
          <div className="flex">
            <div className="flex flex-col gap-2 w-[260px]">
              <label className="text-[13px] font-semibold text-[#333]">
                공개 범위 설정 <span className="text-[#F85858]">*</span>
              </label>
              <VisibilityToggle value={visibility} onChange={setVisibility} />
            </div>

            {/* 비공개 선택 시 참여 코드 입력 표시 */}
            {visibility === "비공개" && (
              <div className="flex flex-col gap-2 w-[230px]">
                <label className="text-[13px] font-semibold text-[#333]">
                  참여 코드 <span className="text-[#F85858]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="참여 코드"
                  value={participationCode}
                  onChange={(e) => setParticipationCode(e.target.value)}
                  className="w-[120px] h-[40px] border border-[rgba(51,51,51,0.3)] rounded-[10px] px-[12px] text-[12px] font-medium text-[#333] placeholder:text-[rgba(51,51,51,0.5)] tracking-[0.36px] outline-none focus:border-[#724BFD] transition-colors"
                />
              </div>
            )}
          </div>

          {/* ── 방 유형 설정 + 최대 인원 수 ─────────────────── */}
          {/* 왼쪽(260px): 방 유형 토글 / 오른쪽(230px): 인원 수 카운터 */}
          <div className="flex">
            <div className="flex flex-col gap-2 w-[260px]">
              <label className="text-[13px] font-semibold text-[#333]">
                방 유형 설정 <span className="text-[#F85858]">*</span>
              </label>
              <RoomTypeToggle value={roomType} onChange={setRoomType} />
            </div>

            <div className="flex flex-col gap-2 w-[230px]">
              <label className="text-[13px] font-semibold text-[#333]">
                최대 인원 수 <span className="text-[#F85858]">*</span>
              </label>
              <ParticipantCounter
                value={maxParticipants}
                onDecrease={decreaseParticipants}
                onIncrease={increaseParticipants}
              />
            </div>
          </div>

          {/* ── 취소 / 생성 버튼 ─────────────────────────────── */}
          <div className="flex gap-[40px] mt-1">
            <button
              onClick={onClose}
              className="flex-1 h-[42px] bg-[#F3F4F6] text-[#333] text-[14px] font-medium rounded-[10px] tracking-[0.45px] hover:bg-[#E9EAEC] transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 h-[42px] bg-[#724BFD] text-white text-[14px] font-medium rounded-[10px] tracking-[0.45px] hover:bg-[#5f3de0] transition-colors disabled:opacity-40"
            >
              {submitting ? "생성 중..." : "생성"}
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
