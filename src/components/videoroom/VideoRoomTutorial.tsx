"use client";

import { Captions, Check, Hand, Mic, Video, X } from "lucide-react";

type TutorialStep = "intro" | "camera" | "captions" | "sign" | "speech";

interface VideoRoomTutorialProps {
  step: TutorialStep;
  isCameraOn: boolean;
  isMicOn: boolean;
  isTranslateOn: boolean;
  onStart: () => void;
  onSkip: () => void;
  onNext: () => void;
  onEnableCamera: () => void;
  onEnableTranslate: () => void;
  onPrepareSign: () => void;
  onPrepareSpeech: () => void;
}

const STEP_ORDER: TutorialStep[] = ["camera", "captions", "sign", "speech"];

export default function VideoRoomTutorial({
  step,
  isCameraOn,
  isMicOn,
  isTranslateOn,
  onStart,
  onSkip,
  onNext,
  onEnableCamera,
  onEnableTranslate,
  onPrepareSign,
  onPrepareSpeech,
}: VideoRoomTutorialProps) {
  if (step === "intro") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4">
        <div className="relative w-full max-w-[460px] rounded-[8px] border border-white/15 bg-[#171717] p-7 text-white shadow-2xl">
          <button
            type="button"
            onClick={onSkip}
            title="튜토리얼 닫기"
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-[6px] text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[8px] bg-[#724BFD]">
            <Hand size={27} />
          </div>
          <h2 className="text-[24px] font-bold">통화방 사용법을 확인할까요?</h2>
          <p className="mt-3 text-[16px] leading-7 text-white/70">
            번역을 켜면 내 수어·음성 인식을 시작합니다. 다른 참가자의 자막은 항상 보입니다.
          </p>
          <div className="mt-7 flex justify-end gap-2">
            <button
              type="button"
              onClick={onSkip}
              className="h-11 px-5 text-[14px] font-semibold text-white/65 hover:text-white"
            >
              건너뛰기
            </button>
            <button
              type="button"
              onClick={onStart}
              className="h-11 rounded-[6px] bg-[#724BFD] px-6 text-[14px] font-semibold hover:bg-[#633be8]"
            >
              튜토리얼 시작
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stepIndex = STEP_ORDER.indexOf(step);
  const content = {
    camera: {
      icon: <Video size={24} />,
      title: "카메라를 켜보세요",
      description: "카메라를 켜면 내 화면이 보이고 수어 인식을 준비합니다.",
      ready: isCameraOn,
      action: onEnableCamera,
      actionLabel: "카메라 켜기",
    },
    captions: {
      icon: <Captions size={24} />,
      title: "수어·음성 번역을 켜보세요",
      description: "내 카메라와 마이크로 인식을 시작합니다. 결과는 같은 방의 모두에게 자막으로 표시됩니다.",
      ready: isTranslateOn,
      action: onEnableTranslate,
      actionLabel: "수어·음성 번역 켜기",
    },
    sign: {
      icon: <Hand size={24} />,
      title: "이제 수어를 해보세요",
      description: "카메라 안에 얼굴과 양손이 보이도록 수어하면 번역 자막이 화면 오른쪽 아래에 표시됩니다.",
      ready: isCameraOn && isTranslateOn,
      action: onPrepareSign,
      actionLabel: "수어 자막 준비하기",
    },
    speech: {
      icon: <Mic size={24} />,
      title: "말하면 음성 자막이 나옵니다",
      description: "마이크를 켜고 말하면 STT 자막이 발화자 이름과 함께 화면 오른쪽 위에 표시됩니다.",
      ready: isMicOn && isTranslateOn,
      action: onPrepareSpeech,
      actionLabel: "음성 자막 준비하기",
    },
  }[step];

  const isLast = step === "speech";

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      <div className="absolute inset-0 bg-black/35" />
      <div className="pointer-events-auto absolute bottom-[98px] left-1/2 w-[min(520px,calc(100vw-32px))] -translate-x-1/2 rounded-[8px] border border-white/15 bg-[#171717] p-6 text-white shadow-2xl">
        <button
          type="button"
          onClick={onSkip}
          title="튜토리얼 닫기"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-[6px] text-white/60 hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>
        <div className="mb-4 flex items-center gap-2">
          {STEP_ORDER.map((item, index) => (
            <span
              key={item}
              className={`h-1.5 flex-1 rounded-full ${index <= stepIndex ? "bg-[#724BFD]" : "bg-white/15"}`}
            />
          ))}
        </div>
        <div className="flex gap-4 pr-8">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] bg-[#724BFD]/20 text-[#9D83FF]">
            {content.icon}
          </div>
          <div>
            <p className="text-[13px] font-semibold text-[#9D83FF]">{stepIndex + 1} / 4</p>
            <h2 className="mt-1 text-[21px] font-bold">{content.title}</h2>
            <p className="mt-2 text-[15px] leading-6 text-white/70">{content.description}</p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
          <div className={`flex items-center gap-2 text-[13px] ${content.ready ? "text-[#6DD27A]" : "text-white/45"}`}>
            <Check size={16} />
            {content.ready ? "준비되었습니다" : "아직 기능이 꺼져 있습니다"}
          </div>
          <div className="flex gap-2">
            {!content.ready && (
              <button
                type="button"
                onClick={content.action}
                className="h-10 rounded-[6px] border border-white/20 px-4 text-[14px] font-semibold hover:bg-white/10"
              >
                {content.actionLabel}
              </button>
            )}
            <button
              type="button"
              onClick={onNext}
              disabled={!content.ready}
              className="h-10 rounded-[6px] bg-[#724BFD] px-5 text-[14px] font-semibold disabled:cursor-not-allowed disabled:opacity-35 hover:not-disabled:bg-[#633be8]"
            >
              {isLast ? "완료" : "다음"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
