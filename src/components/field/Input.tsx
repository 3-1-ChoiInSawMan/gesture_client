"use client";

import { useState } from "react";

interface InputProps {
  label: string;
  value?: string;
  placeholder: string;
  onchange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name: string;
  type: string;
  rightButton?: "send" | "verify" | false;
  onRightButtonClick?: () => void;
  passwordToggle?: boolean;
  errorMessage?: string;
}

export default function Input({
  label,
  value = "",
  placeholder,
  type = "text",
  onchange,
  name,
  rightButton = false,
  onRightButtonClick,
  passwordToggle = false,
  errorMessage,
}: InputProps) {
  const [inputValue, setInputValue] = useState(value);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onchange(e);
  };

  const resolvedType = passwordToggle
    ? showPassword
      ? "text"
      : "password"
    : type;

  return (
    <div className="flex flex-col w-93.75" style={{ gap: "11px" }}>
      <p className="text-[16px] font-semibold text-[#333333]">{label}</p>
      <div className="flex items-center">
        <div
          className={`${rightButton ? "w-74" : "w-93.75"} h-11.5 flex items-center border ${errorMessage ? "border-red-500" : "border-[#333333]"} rounded-[10px] overflow-hidden`}
        >
          <input
            className="ml-5 flex-1 min-h-4.5 text-[15px] bg-transparent outline-none pr-4"
            value={inputValue}
            type={resolvedType}
            placeholder={placeholder}
            onChange={handleChange}
            name={name}
          />
          {passwordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="mr-5.75 flex items-center text-[#AAAAAA]"
            >
              {showPassword ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              )}
            </button>
          )}
        </div>
        {rightButton === "send" && (
          <button
            type="button"
            onClick={onRightButtonClick}
            className="ml-2.25 h-11.5 w-17.5 flex justify-center items-center rounded-[5px] bg-[#724BFD] text-white text-[14px] font-medium whitespace-nowrap"
          >
            전송
          </button>
        )}
        {rightButton === "verify" && (
          <button
            type="button"
            onClick={onRightButtonClick}
            className="ml-2.25 h-11.5 w-17.5 flex justify-center items-center rounded-[5px] bg-white border border-[#724BFD] text-[#724BFD] text-[14px] font-medium whitespace-nowrap"
          >
            확인
          </button>
        )}
      </div>
      {errorMessage && (
        <div className="flex items-center gap-1">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="11" stroke="#ef4444" strokeWidth="2" />
            <line
              x1="12"
              y1="8"
              x2="12"
              y2="13"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="12" cy="16.5" r="1" fill="#ef4444" />
          </svg>
          <p className="text-red-500 text-[12px]">{errorMessage}</p>
        </div>
      )}
    </div>
  );
}
