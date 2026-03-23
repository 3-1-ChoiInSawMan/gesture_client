"use client";

import { useState } from "react";
import Step1Email from "@/components/signup/Step1Email";
import Step2Password from "@/components/signup/Step2Password";
import Step3Profile from "@/components/signup/Step3Profile";

export type SignupFormData = {
  email: string;
  code: string;
  password: string;
  passwordConfirm: string;
  id: string;
  nickname: string;
  statusMessage: string;
  profileImage: File | null;
};

type Step = 1 | 2 | 3;

export default function SignUp() {
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState<SignupFormData>({
    email: "",
    code: "",
    password: "",
    passwordConfirm: "",
    id: "",
    nickname: "",
    statusMessage: "",
    profileImage: null,
  });

  const updateFormData = (fields: Partial<SignupFormData>) => {
    setFormData((prev) => ({ ...prev, ...fields }));
  };

  const nextStep = () =>
    setStep((prev) => (prev < 3 ? ((prev + 1) as Step) : prev));

  return (
    <div className="flex justify-center">
      <div className="flex flex-col items-center min-w-121 min-h-154.25">
        {step !== 3 ? (
          <div className="flex flex-col items-center mt-36.75">
            <h1 className="text-[55px] text-[#724BFD] font-extrabold">
              제스처
            </h1>
            <p className="font-semibold text-[28px] text-[#333333]">
              손짓에서 시작되는 대화
            </p>
          </div>
        ) : (
          <div className="mt-18.5 w-full flex flex-col items-center">
            <Step3Profile formData={formData} updateFormData={updateFormData} />
          </div>
        )}

        {step === 1 && (
          <Step1Email
            formData={formData}
            updateFormData={updateFormData}
            onNext={nextStep}
          />
        )}
        {step === 2 && (
          <Step2Password
            formData={formData}
            updateFormData={updateFormData}
            onNext={nextStep}
          />
        )}
      </div>
    </div>
  );
}
