"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Settings, X } from "lucide-react";
import { toast } from "react-toastify";
import {
  PresetQuickSlot,
  quickSlotApi,
  QuickSlot,
} from "@/api/quickSlotApi";

function hydratePreset(
  presetSlots: PresetQuickSlot[],
  availableSlots: QuickSlot[]
): PresetQuickSlot[] {
  const availableById = new Map(
    availableSlots.map((slot) => [slot.idx, slot])
  );
  return presetSlots.map((slot, index) => {
    const available = availableById.get(slot.quickSlotId);
    return {
      ...slot,
      name: slot.name || available?.name || "퀵슬롯",
      iconUuid: slot.iconUuid || available?.iconUuid || "",
      iconUrl: slot.iconUrl || available?.iconUrl || "",
      order: slot.order || index + 1,
    };
  });
}

export default function QuickSlots() {
  const [availableSlots, setAvailableSlots] = useState<QuickSlot[]>([]);
  const [presetSlots, setPresetSlots] = useState<PresetQuickSlot[]>([]);
  const [draftIds, setDraftIds] = useState<number[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([quickSlotApi.getAvailable(), quickSlotApi.getPreset()])
      .then(([available, preset]) => {
        if (cancelled) return;
        setAvailableSlots(available);
        setPresetSlots(hydratePreset(preset.quickSlots, available));
      })
      .catch(() => {
        if (!cancelled) {
          setErrorMessage("퀵슬롯 정보를 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openSettings = () => {
    setDraftIds(presetSlots.map((slot) => slot.quickSlotId));
    setErrorMessage("");
    setShowSettings(true);
  };

  const closeSettings = () => {
    if (saving) return;
    setShowSettings(false);
  };

  const toggleSlot = (slotId: number) => {
    setDraftIds((current) =>
      current.includes(slotId)
        ? current.filter((id) => id !== slotId)
        : [...current, slotId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage("");
    try {
      const preset = await quickSlotApi.updatePreset(draftIds);
      setPresetSlots(hydratePreset(preset.quickSlots, availableSlots));
      setShowSettings(false);
      toast.success("퀵슬롯 프리셋을 저장했습니다.");
    } catch {
      setErrorMessage("퀵슬롯 프리셋을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 flex-1">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Settings size={17} className="text-[#724BFD]" />
          <p className="text-[16px] font-bold text-[#333333]">퀵슬롯 설정</p>
        </div>
        <button
          onClick={openSettings}
          disabled={loading}
          className="h-9 px-3 rounded-[8px] bg-[#333333] text-white text-[12px] font-semibold flex items-center gap-2 disabled:opacity-50"
        >
          <Settings size={15} />
          설정
        </button>
      </div>

      {!showSettings && errorMessage && (
        <p className="text-[12px] text-[#FF5555]">{errorMessage}</p>
      )}

      {loading ? (
        <div className="min-h-[120px] flex items-center justify-center">
          <LoaderCircle size={20} className="animate-spin text-[#724BFD]" />
        </div>
      ) : presetSlots.length === 0 ? (
        <div className="flex-1 flex items-center justify-center bg-[#F5F5F5] rounded-[8px] py-8">
          <p className="text-[13px] text-[#AAAAAA]">
            설정된 퀵슬롯이 없습니다.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {presetSlots.map((slot) => (
            <div
              key={slot.quickSlotId}
              className="min-w-0 border border-[#EEEEEE] bg-white p-3 flex items-center gap-3 rounded-[8px]"
            >
              <div className="w-12 h-12 rounded-[8px] bg-[#F1ECFF] flex items-center justify-center overflow-hidden shrink-0">
                {slot.iconUrl ? (
                  <video
                    src={slot.iconUrl}
                    muted
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Settings size={18} className="text-[#724BFD]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#333333] truncate">
                  {slot.name}
                </p>
                <p className="text-[11px] text-[#999999]">
                  프리셋 {slot.order}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showSettings && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeSettings();
          }}
        >
          <div className="w-[640px] max-w-full max-h-[80vh] bg-white rounded-[8px] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#EEEEEE]">
              <div>
                <p className="text-[16px] font-bold text-[#333333]">
                  퀵슬롯 설정
                </p>
                <p className="mt-1 text-[12px] text-[#888888]">
                  선택한 순서대로 프리셋에 배치됩니다.
                </p>
              </div>
              <button
                onClick={closeSettings}
                disabled={saving}
                title="닫기"
                className="w-8 h-8 flex items-center justify-center text-[#AAAAAA] hover:text-[#333333] disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {errorMessage && (
                <p className="mb-3 text-[12px] text-[#FF5555]">
                  {errorMessage}
                </p>
              )}
              {availableSlots.length === 0 ? (
                <div className="min-h-[180px] flex items-center justify-center bg-[#F7F7F7] rounded-[8px]">
                  <p className="text-[13px] text-[#AAAAAA]">
                    사용 가능한 퀵슬롯이 없습니다.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {availableSlots.map((slot) => {
                    const selected = draftIds.includes(slot.idx);
                    const selectedOrder = draftIds.indexOf(slot.idx) + 1;
                    return (
                      <button
                        key={slot.idx}
                        onClick={() => toggleSlot(slot.idx)}
                        className={`relative min-w-0 text-left border p-3 flex items-center gap-3 transition-colors rounded-[8px] ${
                          selected
                            ? "border-[#724BFD] bg-[#F8F5FF]"
                            : "border-[#EEEEEE] bg-white hover:bg-[#F8F8F8]"
                        }`}
                      >
                        <div className="w-12 h-12 rounded-[8px] bg-[#F1ECFF] flex items-center justify-center overflow-hidden shrink-0">
                          {slot.iconUrl ? (
                            <video
                              src={slot.iconUrl}
                              muted
                              playsInline
                              preload="metadata"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Settings size={18} className="text-[#724BFD]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-[#333333] truncate">
                            {slot.name}
                          </p>
                          <p className="text-[11px] text-[#888888] truncate">
                            {slot.description || "설명 없음"}
                          </p>
                        </div>
                        {selected && (
                          <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#724BFD] text-white text-[10px] font-bold flex items-center justify-center">
                            {selectedOrder}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-[#EEEEEE] flex items-center justify-between gap-3">
              <p className="text-[12px] text-[#888888]">
                {draftIds.length}개 선택
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={closeSettings}
                  disabled={saving}
                  className="h-9 px-4 text-[13px] text-[#777777] disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="h-9 min-w-[72px] px-4 rounded-[8px] bg-[#724BFD] text-white text-[13px] font-semibold flex items-center justify-center disabled:opacity-50"
                >
                  {saving ? (
                    <LoaderCircle size={16} className="animate-spin" />
                  ) : (
                    "저장"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
