'use client';
import * as C from '@/components';
import * as I from '@/assets/index';
import Link from 'next/link';
import useAuth from "@/hooks/useAuth";
import { useState } from 'react';
import { loginInputFields } from '@/constants/auth';

export default function Login(){
  const { login, loading } = useAuth();
  const [formData, setFormData] = useState({
    id: "",
    password: "",
  });
  const [autoLogin, setAutoLogin] = useState(false);

  const loginButtonImages = [
    {image: I.Kakao, alt:"kakao"},
    {image: I.Naver, alt:"naver"},
    {image: I.Google, alt:"google"}
  ]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({
      ...formData,
      autoLogin,
    });
  };

  return (
    <div className="flex justify-center pb-17.5">
      <div className="flex flex-col items-center min-w-121 min-h-154.25 mt-34.25">
        <div className="flex flex-col justify-between items-center">
          <h1 className="text-[55px] text-[#724BFD] font-extrabold">제스처</h1>
          <p className="font-semibold text-[28px] text-[#333333]">
            손짓에서 시작되는 대화
          </p>
        </div>
        <form
          onSubmit={handleSubmit}
          className="min-w-93.75 min-h-64.5 flex flex-col mt-14.25 justify-between"
        >
          {loginInputFields.map((i) => (
            <C.Input
              key={i.name}
              label={i.label}
              value={formData[i.name as keyof typeof formData]}
              placeholder={i.placeholder}
              onchange={handleChange}
              name={i.name}
              type={i.type}
            />
          ))}
          <div className="flex w-23 min-h-4.5 justify-between">
            <input
              type="checkbox"
              checked={autoLogin}
              onChange={(e) => {
                setAutoLogin(e.target.checked);
                console.log(`자동 로그인: ${e.target.checked ? "on" : "off"}`);
              }}
            />
            <p className="text-[12px] text-[#333333]">자동 로그인</p>
          </div>
          <div className="w-93.75 h-12.5">
            <button
              className="w-full h-full flex justify-center items-center bg-[#724BFD] rounded-[10px] text-[18px] font-semibold text-white"
              type="submit"
              disabled={loading}
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </div>
        </form>
        <div className="flex justify-center w-full mt-5">
          <p className="text-[#6D6D6D] text-[16px]">
            계정이 없으십니까?{" "}
            <Link href="/auth/signup">
              <span className="text-[#724BFD] pl-2 cursor-pointer">회원가입</span>
            </Link>
          </p>
        </div>
        <div className="flex justify-center w-full mt-5">
          <p className="text-[#724BFD] text-[16px] cursor-pointer">
            비밀번호를 잊으셨습니까?
          </p>
        </div>
        <div className="flex justify-between items-center w-121 h-4.5 mt-7.5">
          <div className="h-px w-38 border-[#3A3A3A] border-b" />
          <p className="text-[15px] text-[#6B6B6B]">또는 다음으로 로그인</p>
          <div className="h-px w-38 border-[#3A3A3A] border-b" />
        </div>
        <div className="w-50 h-12 flex justify-between mt-9.25">
          {loginButtonImages.map((i) => (
            <C.LoginButton image={i.image} alt={i.alt} key={i.alt} />
          ))}
        </div>
      </div>
    </div>
  );
}