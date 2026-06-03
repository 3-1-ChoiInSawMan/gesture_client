"use client";

import { useState, useEffect } from "react";
import { Settings, Plus } from "lucide-react";
import { quickSlotApi, QuickSlot, QuickAction } from "@/api/quickSlotApi";

const SLOT_COLORS = ["bg-[#FFF3E8]", "bg-[#FFF8E8]", "bg-[#FFF3E8]", "bg-[#EDFFF3]"];

export default function QuickSlots() {
  const [mySlots, setMySlots] = useState<(QuickSlot | null)[]>([]);
  const [allSlots, setAllSlots] = useState<QuickAction[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editSlots, setEditSlots] = useState<(string | null)[]>([null, null, null, null]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchMy = async () => {
    const my = await quickSlotApi.getMy();
    const normalized: (QuickSlot | null)[] = Array.from({ length: 4 }, (_, i) => my[i] ?? null);
    setMySlots(normalized);
    return normalized;
  };

  useEffect(() => {
    Promise.all([quickSlotApi.getMy(), quickSlotApi.getAll()])
      .then(([my, all]) => {
        setMySlots(Array.from({ length: 4 }, (_, i) => my[i] ?? null));
        setAllSlots(all);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const hasSlots = mySlots.some((s) => s !== null);

  const handleOpenEdit = () => {
    setEditSlots(mySlots.map((s) => s?.actionName ?? null));
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = editSlots.map((name) => {
        if (!name) return null;
        const found = allSlots.find((a) => a.name === name);
        return found ? { actionName: found.name, mediaUrl: found.mediaUrl } : null;
      });
      await quickSlotApi.update(payload);
      await fetchMy();
      setIsEditing(false);
    } catch {
      // 저장 실패 시 무시
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="flex flex-col gap-3 flex-1">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings size={17} className="text-[#724BFD]" />
          <p className="text-[16px] font-bold text-[#333333]">수어 퀵 슬롯 관리</p>
        </div>
        {isEditing ? (
          <div className="flex gap-3">
            <button
              onClick={() => setIsEditing(false)}
              className="text-[13px] text-[#AAAAAA]"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-[13px] text-[#724BFD] font-medium disabled:opacity-50"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        ) : (
          <button onClick={handleOpenEdit} className="flex items-center gap-1">
            <Settings size={13} className="text-[#724BFD]" />
            <p className="text-[13px] text-[#724BFD]">슬롯 관리</p>
          </button>
        )}
      </div>

      {/* 빈 슬롯 상태 */}
      {!isEditing && !hasSlots && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-[#F5F5F5] rounded-[14px] py-8">
          <p className="text-[13px] text-[#AAAAAA]">등록된 퀵슬롯이 없습니다</p>
          <button
            onClick={handleOpenEdit}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#724BFD] rounded-[10px] text-white text-[13px] font-medium"
          >
            <Plus size={14} />
            퀵슬롯 등록하기
          </button>
        </div>
      )}

      {/* 슬롯 보기 */}
      {!isEditing && hasSlots && (
        <div className="grid grid-cols-4 gap-3 flex-1">
          {mySlots.map((slot, i) => (
            <div
              key={i}
              className={`${SLOT_COLORS[i]} rounded-[14px] flex flex-col items-center justify-center gap-2 min-h-[80px] p-2`}
            >
              {slot ? (
                <>
                  {slot.mediaUrl && (
                    <img
                      src={slot.mediaUrl}
                      alt={slot.actionName}
                      className="w-8 h-8 object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  )}
                  <p className="text-[12px] font-medium text-[#333333] text-center leading-tight px-1">
                    {slot.actionName}
                  </p>
                </>
              ) : (
                <p className="text-[11px] text-[#AAAAAA]">비어있음</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 슬롯 편집 */}
      {isEditing && (
        <div className="grid grid-cols-4 gap-3 flex-1">
          {editSlots.map((selected, i) => (
            <div
              key={i}
              className={`${SLOT_COLORS[i]} rounded-[14px] flex flex-col items-center justify-center gap-2 min-h-[80px] p-2`}
            >
              <p className="text-[11px] font-medium text-[#724BFD]">슬롯 {i + 1}</p>
              {allSlots.length === 0 ? (
                <p className="text-[10px] text-[#AAAAAA] text-center">등록된 퀵슬롯 없음</p>
              ) : (
                <select
                  value={selected ?? ""}
                  onChange={(e) => {
                    const next = [...editSlots];
                    next[i] = e.target.value || null;
                    setEditSlots(next);
                  }}
                  className="w-full text-[11px] bg-white border border-[#D9D9D9] rounded-[8px] px-1.5 py-1 text-[#333333] cursor-pointer outline-none"
                >
                  <option value="">없음</option>
                  {allSlots.map((a) => (
                    <option key={a.name} value={a.name}>
                      {a.name}
                    </option>
                  ))}
                </select>
              )}
              {selected && allSlots.find((a) => a.name === selected)?.mediaUrl && (
                <img
                  src={allSlots.find((a) => a.name === selected)!.mediaUrl}
                  alt={selected}
                  className="w-7 h-7 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
