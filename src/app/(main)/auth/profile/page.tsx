"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import useAuth from "@/hooks/useAuth";
import ProfileCard from "@/components/profile/ProfileCard";
import AccountSettings from "@/components/profile/AccountSettings";
import NotificationSettings from "@/components/profile/NotificationSettings";
import RecentChats from "@/components/profile/RecentChats";
import QuickSlots from "@/components/profile/QuickSlots";
import MeetingNotes from "@/components/profile/MeetingNotes";

export default function ProfilePage() {
  const { user, _hasHydrated } = useAuthStore();
  const { logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (_hasHydrated && !user) router.push("/auth/login");
  }, [user, _hasHydrated, router]);

  if (!_hasHydrated) return null;
  if (!user) return null;

  return (
    <div className="w-full min-h-screen bg-white">
      <div className="w-[1024px] mx-auto py-10 flex flex-col gap-8">
        <ProfileCard user={user} />
        <div className="flex gap-6 items-stretch">
          <div className="flex flex-col gap-5 w-[330px] flex-shrink-0">
            <AccountSettings onLogout={logout} />
            <NotificationSettings />
          </div>
          <div className="flex flex-col gap-5 flex-1">
            <MeetingNotes userId={user.id} />
            <RecentChats />
            <QuickSlots />
          </div>
        </div>
      </div>
    </div>
  );
}
