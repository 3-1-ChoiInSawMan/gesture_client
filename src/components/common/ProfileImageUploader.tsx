"use client";

import Image from "next/image";
import { DefaultProfile } from "@/assets";

interface ProfileImageUploaderProps {
  previewUrl: string | null;
  inputId?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function ProfileImageUploader({
  previewUrl,
  inputId = "profileImage",
  onChange,
}: ProfileImageUploaderProps) {
  return (
    <div className="flex justify-center">
      <label htmlFor={inputId} className="cursor-pointer relative">
        <div className="w-36 h-36 rounded-full overflow-hidden">
          <Image
            src={previewUrl ?? DefaultProfile}
            alt="프로필"
            width={144}
            height={144}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute bottom-0 right-0 w-9 h-9 bg-[#724BFD] rounded-full flex items-center justify-center">
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </div>
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onChange}
      />
    </div>
  );
}
