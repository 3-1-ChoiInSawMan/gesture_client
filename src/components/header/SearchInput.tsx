"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, X } from "lucide-react";

export default function SearchInput() {
  const [value, setValue] = useState("");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const timer = setTimeout(() => {
      const keyword = value.trim();
      if (keyword) {
        if (pathname === "/") {
          // 메인 페이지 → 통화방 페이지로 이동하면서 검색
          router.push(`/call?q=${encodeURIComponent(keyword)}`);
        } else if (pathname === "/call") {
          // 통화방 페이지 → URL만 업데이트 (방 그리드 실시간 반영)
          router.replace(`/call?q=${encodeURIComponent(keyword)}`, { scroll: false });
        }
      } else {
        if (pathname === "/call") {
          router.replace("/call", { scroll: false });
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value, pathname, router]);

  const handleClear = () => {
    setValue("");
    if (pathname === "/call") router.replace("/call", { scroll: false });
  };

  return (
    <div className="flex items-center w-67.5 h-7 bg-[#F5F5F5] rounded-[100px] px-4 gap-2">
      <Search size={15} className="text-[#AAAAAA] shrink-0" />
      <input
        className="flex-1 bg-transparent outline-none text-[12px] text-[#333333] placeholder:text-[#AAAAAA]"
        placeholder="검색어를 입력하세요"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {value && (
        <button onClick={handleClear} aria-label="검색어 지우기">
          <X size={13} className="text-[#AAAAAA] hover:text-[#555] transition-colors" />
        </button>
      )}
    </div>
  );
}
