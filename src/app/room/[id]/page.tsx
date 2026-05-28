"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RoomIdPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/call");
  }, [router]);

  return null;
}
