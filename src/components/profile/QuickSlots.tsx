"use client";

import { useEffect, useState } from "react";
import { Settings, Trash2 } from "lucide-react";
import { quickSlotApi, QuickSlot } from "@/api/quickSlotApi";

function formatCreatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function QuickSlots() {
  const [slots, setSlots] = useState<QuickSlot[]>([]);
  const [editing, setEditing] = useState<QuickSlot | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchSlots = async () => {
    const data = await quickSlotApi.getMy();
    setSlots(data);
  };

  useEffect(() => {
    fetchSlots()
      .catch(() => {
        setErrorMessage("퀵슬롯 정보를 불러오지 못했습니다.");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleOpenEdit = (slot: QuickSlot) => {
    setErrorMessage("");
    setEditing(slot);
    setEditName(slot.name);
    setEditDescription(slot.description);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setErrorMessage("");

    try {
      const updated = await quickSlotApi.update(editing.idx, {
        name: editName.trim(),
        description: editDescription.trim(),
        iconUuid: editing.iconUuid,
      });
      setSlots((prev) =>
        prev
          .map((slot) => (slot.idx === updated.idx ? updated : slot))
          .sort((a, b) => a.order - b.order),
      );
      setEditing(null);
    } catch {
      setErrorMessage("퀵슬롯 수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (slot: QuickSlot) => {
    setErrorMessage("");

    try {
      await quickSlotApi.remove(slot.idx);
      setSlots((prev) => prev.filter((item) => item.idx !== slot.idx));
      if (editing?.idx === slot.idx) setEditing(null);
    } catch {
      setErrorMessage("퀵슬롯 삭제에 실패했습니다.");
    }
  };

  if (loading) return null;

  return (
    <div className="flex flex-col gap-3 flex-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings size={17} className="text-[#724BFD]" />
          <p className="text-[16px] font-bold text-[#333333]">퀵슬롯 관리</p>
        </div>
      </div>

      {errorMessage && (
        <p className="text-[12px] text-[#FF5555]">{errorMessage}</p>
      )}

      {slots.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 bg-[#F5F5F5] rounded-[14px] py-8">
          <p className="text-[13px] text-[#AAAAAA]">업로드한 퀵슬롯이 없습니다</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            {slots.map((slot) => (
              <button
                key={slot.idx}
                onClick={() => handleOpenEdit(slot)}
                className={`text-left rounded-[14px] border p-3 flex items-center gap-3 transition-colors ${
                  editing?.idx === slot.idx
                    ? "border-[#724BFD] bg-[#F8F5FF]"
                    : "border-[#EEEEEE] bg-white hover:bg-[#F8F8F8]"
                }`}
              >
                <div className="w-11 h-11 rounded-[12px] bg-[#F1ECFF] flex items-center justify-center overflow-hidden shrink-0">
                  {slot.iconUrl ? (
                    <video
                      src={slot.iconUrl}
                      muted
                      playsInline
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
                  <p className="text-[11px] text-[#AAAAAA] truncate">
                    {slot.description || "설명 없음"}
                  </p>
                  <p className="text-[10px] text-[#C0C0C0]">
                    {formatCreatedAt(slot.createdAt)}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {editing && (
            <div className="rounded-[14px] border border-[#EEEEEE] bg-white p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-[14px] font-semibold text-[#333333]">퀵슬롯 수정</p>
                <button
                  onClick={() => handleDelete(editing)}
                  className="flex items-center gap-1 text-[12px] text-[#FF5555]"
                >
                  <Trash2 size={13} />
                  삭제
                </button>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-[12px] text-[#777777]">이름</span>
                <input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  className="h-9 rounded-[8px] border border-[#DDDDDD] px-3 text-[13px] text-[#333333] outline-none focus:border-[#724BFD]"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[12px] text-[#777777]">설명</span>
                <textarea
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  rows={3}
                  className="resize-none rounded-[8px] border border-[#DDDDDD] px-3 py-2 text-[13px] text-[#333333] outline-none focus:border-[#724BFD]"
                />
              </label>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditing(null)}
                  className="px-3 py-2 text-[13px] text-[#999999]"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !editName.trim()}
                  className="px-4 py-2 rounded-[8px] bg-[#724BFD] text-white text-[13px] font-medium disabled:opacity-50"
                >
                  {saving ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
