"use client";

import { useState } from "react";
import { Search } from "lucide-react";

export default function SearchInput() {
  const [value, setValue] = useState("");

  return (
    <div className="flex items-center w-67.5 h-7 bg-[#F5F5F5] rounded-[100px] px-4 gap-2">
      <Search size={15} className="text-[#AAAAAA]" />
      <input
        className="flex-1 bg-transparent outline-none text-[12px] text-[#333333] placeholder:text-[#AAAAAA]"
        placeholder="검색어를 입력하세요"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}
