"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, RotateCw, X, Zap } from "lucide-react";
import { PresetQuickSlot, quickSlotApi } from "@/api/quickSlotApi";

interface QuickSlotPanelProps {
  onClose: () => void;
}

export default function QuickSlotPanel({ onClose }: QuickSlotPanelProps) {
  const [slots, setSlots] = useState<PresetQuickSlot[]>([]);
  const [selected, setSelected] = useState<PresetQuickSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadPreset = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const preset = await quickSlotApi.getPreset();
      setSlots(preset.quickSlots);
      setSelected((current) => {
        if (current) {
          return (
            preset.quickSlots.find(
              (slot) => slot.quickSlotId === current.quickSlotId
            ) ?? preset.quickSlots[0] ?? null
          );
        }
        return preset.quickSlots[0] ?? null;
      });
    } catch {
      setErrorMessage("퀵슬롯 프리셋을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    quickSlotApi
      .getPreset()
      .then((preset) => {
        if (cancelled) return;
        setSlots(preset.quickSlots);
        setSelected(preset.quickSlots[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setErrorMessage("퀵슬롯 프리셋을 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside className="relative z-[60] w-[320px] shrink-0 flex flex-col bg-white border-l border-[#E6E9EE] h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E6E9EE]">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-[#724BFD]" />
          <span className="text-[14px] font-semibold text-[#333333]">퀵슬롯</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={loadPreset}
            title="새로고침"
            className="w-7 h-7 flex items-center justify-center text-[#AAAAAA] hover:text-[#333333]"
          >
            <RotateCw size={15} />
          </button>
          <button
            onClick={onClose}
            title="닫기"
            className="w-7 h-7 flex items-center justify-center text-[#AAAAAA] hover:text-[#333333]"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <LoaderCircle size={22} className="animate-spin text-[#724BFD]" />
          </div>
        ) : errorMessage ? (
          <div className="h-full flex items-center justify-center text-center">
            <p className="text-[12px] text-[#FF5555]">{errorMessage}</p>
          </div>
        ) : slots.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center">
            <p className="text-[13px] text-[#999999]">
              설정된 퀵슬롯이 없습니다.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {selected && (
              <div className="flex flex-col gap-2">
                <div className="aspect-video overflow-hidden rounded-[8px] bg-black">
                  {selected.iconUrl ? (
                    <video
                      key={selected.iconUrl}
                      src={selected.iconUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      controls
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Zap size={28} className="text-white/60" />
                    </div>
                  )}
                </div>
                <p className="text-[13px] font-semibold text-[#333333]">
                  {selected.name}
                </p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.quickSlotId}
                  onClick={() => setSelected(slot)}
                  title={slot.name}
                  className={`min-w-0 overflow-hidden border transition-colors rounded-[8px] ${
                    selected?.quickSlotId === slot.quickSlotId
                      ? "border-[#724BFD] bg-[#F8F5FF]"
                      : "border-[#E6E9EE] hover:border-[#B8A7FF]"
                  }`}
                >
                  <div className="aspect-square bg-[#F5F5F5] overflow-hidden">
                    {slot.iconUrl ? (
                      <video
                        src={slot.iconUrl}
                        muted
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Zap size={18} className="text-[#724BFD]" />
                      </div>
                    )}
                  </div>
                  <p className="px-1.5 py-1.5 text-[10px] font-medium text-[#555555] truncate">
                    {slot.name}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
