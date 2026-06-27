"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, Save, Settings } from "lucide-react";
import { toast } from "react-toastify";
import { quickSlotApi, QuickSlot } from "@/api/quickSlotApi";

export default function QuickSlots() {
  const [slots, setSlots] = useState<QuickSlot[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([quickSlotApi.getAvailable(), quickSlotApi.getPreset()])
      .then(([available, preset]) => {
        if (cancelled) return;
        setSlots(available);
        setSelectedIds(preset.quickSlots.map((slot) => slot.quickSlotId));
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

  const toggleSlot = (slotId: number) => {
    setSelectedIds((current) =>
      current.includes(slotId)
        ? current.filter((id) => id !== slotId)
        : [...current, slotId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage("");
    try {
      const preset = await quickSlotApi.updatePreset(selectedIds);
      setSelectedIds(preset.quickSlots.map((slot) => slot.quickSlotId));
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
          onClick={handleSave}
          disabled={loading || saving}
          title="프리셋 저장"
          className="h-9 px-3 rounded-[8px] bg-[#333333] text-white text-[12px] font-semibold flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <LoaderCircle size={15} className="animate-spin" />
          ) : (
            <Save size={15} />
          )}
          저장
        </button>
      </div>

      {errorMessage && (
        <p className="text-[12px] text-[#FF5555]">{errorMessage}</p>
      )}

      {loading ? (
        <div className="min-h-[120px] flex items-center justify-center">
          <LoaderCircle size={20} className="animate-spin text-[#724BFD]" />
        </div>
      ) : slots.length === 0 ? (
        <div className="flex-1 flex items-center justify-center bg-[#F5F5F5] rounded-[8px] py-8">
          <p className="text-[13px] text-[#AAAAAA]">사용 가능한 퀵슬롯이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {slots.map((slot) => {
            const selected = selectedIds.includes(slot.idx);
            const selectedOrder = selectedIds.indexOf(slot.idx) + 1;
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
  );
}
