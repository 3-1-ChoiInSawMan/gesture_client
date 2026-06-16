"use client";

import { Captions, Check, Hand, Mic, Video, X } from "lucide-react";

type TutorialStep = "intro" | "camera" | "captions" | "sign" | "speech";

interface VideoRoomTutorialProps {
  step: TutorialStep;
  isCameraOn: boolean;
  isMicOn: boolean;
  isSubtitlesOn: boolean;
  onStart: () => void;
  onSkip: () => void;
  onNext: () => void;
  onEnableCamera: () => void;
  onEnableSubtitles: () => void;
  onPrepareSign: () => void;
  onPrepareSpeech: () => void;
}

const STEP_ORDER: TutorialStep[] = ["camera", "captions", "sign", "speech"];

export default function VideoRoomTutorial({
  step,
  isCameraOn,
  isMicOn,
  isSubtitlesOn,
  onStart,
  onSkip,
  onNext,
  onEnableCamera,
  onEnableSubtitles,
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
            카메라와 자막을 켜고 수어·음성 자막을 사용하는 방법을 직접 확인합니다.
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
      title: "자막을 켜보세요",
      description: "자막을 켜면 수어 번역과 음성 인식 결과를 화면에서 볼 수 있습니다.",
      ready: isSubtitlesOn,
      action: onEnableSubtitles,
      actionLabel: "자막 켜기",
    },
    sign: {
      icon: <Hand size={24} />,
      title: "이제 수어를 해보세요",
      description: "카메라 안에 얼굴과 양손이 보이도록 수어하면 번역 자막이 화면 오른쪽 아래에 표시됩니다.",
      ready: isCameraOn && isSubtitlesOn,
      action: onPrepareSign,
      actionLabel: "수어 자막 준비하기",
    },
    speech: {
      icon: <Mic size={24} />,
      title: "말하면 음성 자막이 나옵니다",
      description: "마이크를 켜고 말하면 STT 자막이 발화자 이름과 함께 화면 오른쪽 위에 표시됩니다.",
      ready: isMicOn && isSubtitlesOn,
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
