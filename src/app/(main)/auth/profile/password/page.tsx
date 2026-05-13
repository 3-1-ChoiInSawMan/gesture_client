"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { userApi } from "@/api/userApi";
import * as C from "@/components";
import { Lock } from "lucide-react";

type Errors = {
  current?: string;
  newPassword?: string;
  confirm?: string;
};

export default function PasswordChangePage() {
  const router = useRouter();

  const [current, setCurrent] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "current") {
      setCurrent(value);
      setErrors((prev) => ({ ...prev, current: undefined }));
    }
    if (name === "newPassword") {
      setNewPassword(value);
      setErrors((prev) => ({ ...prev, newPassword: undefined }));
    }
    if (name === "confirm") {
      setConfirm(value);
      setErrors((prev) => ({ ...prev, confirm: undefined }));
    }
  };

  const handleSubmit = async () => {
    const newErrors: Errors = {};
    if (!current) newErrors.current = "현재 비밀번호를 입력해주세요.";
    if (!newPassword) newErrors.newPassword = "새 비밀번호를 입력해주세요.";
    if (!confirm) newErrors.confirm = "비밀번호 확인을 입력해주세요.";
    else if (newPassword !== confirm)
      newErrors.confirm = "비밀번호가 일치하지 않습니다.";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await userApi.updatePassword({
        currentPassword: current,
        newPassword,
        newPasswordConfirm: confirm,
      });
      toast.success("비밀번호가 변경되었습니다.");
      router.push("/auth/profile");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "비밀번호 변경에 실패했습니다.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-white flex justify-center items-start">
      <div className="flex flex-col items-center py-30 gap-10">
        <div className="flex items-center gap-4 w-[375px]">
          <div className="flex items-center justify-center flex-shrink-0 w-[42px] h-[42px] rounded-[10px] bg-[#636AE8]/20">
            <Lock size={20} color="#724BFD" />
          </div>
          <p className="text-[28px] font-semibold text-[#333333]">비밀번호 변경</p>
        </div>

        <div className="flex flex-col gap-6">
          <C.Input
            label="현재 비밀번호"
            value={current}
            placeholder="현재 비밀번호"
            onChange={handleChange}
            name="current"
            type="password"
            passwordToggle
            errorMessage={errors.current}
          />
          <C.Input
            label="새 비밀번호"
            value={newPassword}
            placeholder="새 비밀번호"
            onChange={handleChange}
            name="newPassword"
            type="password"
            passwordToggle
            errorMessage={errors.newPassword}
          />
          <C.Input
            label="비밀번호 확인"
            value={confirm}
            placeholder="비밀번호 확인"
            onChange={handleChange}
            name="confirm"
            type="password"
            passwordToggle
            errorMessage={errors.confirm}
          />
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={loading}
            className="w-[175px] h-[46px] flex justify-center items-center bg-[#F3F4F6] rounded-[10px] text-[16px] font-semibold text-[#333333] disabled:opacity-40"
          >
            이전
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-[175px] h-[46px] flex justify-center items-center bg-[#724BFD] rounded-[10px] text-[16px] font-semibold text-white disabled:opacity-40"
          >
            {loading ? "변경 중..." : "완료"}
          </button>
        </div>
      </div>
    </div>
  );
}
