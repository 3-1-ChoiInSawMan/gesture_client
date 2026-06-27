"use client";

import { useEffect, useState } from "react";
import { ClipboardList, X } from "lucide-react";
import { meetingApi, MeetingMinutes } from "@/api/meetingApi";
import { getMeetingNotes, MeetingNoteRecord } from "@/lib/meetingNotes";

interface MeetingNotesProps {
  userId: string;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
  }).format(new Date(value));
}

function mergeServerMinutes(
  local: MeetingNoteRecord,
  minutes: MeetingMinutes
): MeetingNoteRecord {
  const summaryParts = [
    minutes.content,
    minutes.aiSummary,
    minutes.conclusion?.filter(Boolean).length
      ? `결론\n${minutes.conclusion
          .filter((item): item is string => Boolean(item))
          .map((item) => `- ${item}`)
          .join("\n")}`
      : null,
  ].filter((item): item is string => Boolean(item));

  return {
    ...local,
    minutesIdx: minutes.minutesIdx,
    callIdx: minutes.callIdx,
    roomIdx: minutes.roomIdx,
    title: minutes.title ?? local.title,
    startedAt: minutes.startedAt ?? minutes.meetingDate ?? local.startedAt,
    endedAt: minutes.endedAt ?? local.endedAt,
    attendees: minutes.participants ?? local.attendees,
    attendeesText: (minutes.participants ?? local.attendees).join(", "),
    content: summaryParts.join("\n\n") || local.content,
    aiSummary: minutes.aiSummary,
    conclusion: minutes.conclusion,
    status: minutes.status,
  };
}

export default function MeetingNotes({ userId }: MeetingNotesProps) {
  const [notes, setNotes] = useState<MeetingNoteRecord[]>(() =>
    getMeetingNotes(userId)
  );
  const [selected, setSelected] = useState<MeetingNoteRecord | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const localNotes = getMeetingNotes(userId);

    const loadServerNotes = async () => {
      const indexed = new Map<number, MeetingNoteRecord>();
      localNotes.forEach((note) => {
        if (note.minutesIdx) indexed.set(note.minutesIdx, note);
      });

      const roomIndexes = Array.from(
        new Set(
          localNotes
            .map((note) => note.roomIdx)
            .filter((roomIdx): roomIdx is number => typeof roomIdx === "number")
        )
      );
      const roomLists = await Promise.all(
        roomIndexes.map((roomIdx) =>
          meetingApi.getRoomMinutes(roomIdx).catch(() => [])
        )
      );
      roomLists.flat().forEach((item) => {
        if (indexed.has(item.minutesIdx)) return;
        indexed.set(item.minutesIdx, {
          id: `server-${item.minutesIdx}`,
          minutesIdx: item.minutesIdx,
          callIdx: item.callIdx,
          userId,
          roomId: "",
          roomTitle: "회의",
          title: item.title,
          startedAt: item.meetingDate,
          endedAt: item.meetingDate,
          attendees: [],
          status: item.status,
          createdAt: item.meetingDate,
        });
      });

      const refreshed = await Promise.all(
        Array.from(indexed.values()).map(async (note) => {
          if (!note.minutesIdx) return note;
          try {
            const minutes = await meetingApi.getMinutes(note.minutesIdx);
            return mergeServerMinutes(note, minutes);
          } catch {
            return note;
          }
        })
      );
      const localOnly = localNotes.filter((note) => !note.minutesIdx);
      const merged = [...refreshed, ...localOnly].sort(
        (a, b) =>
          new Date(b.startedAt || b.createdAt).getTime() -
          new Date(a.startedAt || a.createdAt).getTime()
      );
      if (!cancelled) setNotes(merged);
    };

    void loadServerNotes();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList size={17} className="text-[#724BFD]" />
          <p className="text-[16px] font-bold text-[#333333]">회의록</p>
        </div>
        {notes.length > 5 && (
          <button
            onClick={() => setShowAll(true)}
            className="text-[13px] text-[#724BFD]"
          >
            전체보기
          </button>
        )}
      </div>

      {notes.length === 0 ? (
        <div className="flex items-center justify-center border border-[#EEEEEE] rounded-[14px] min-h-[96px]">
          <p className="text-[13px] text-[#AAAAAA]">저장된 회의록이 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col border border-[#EEEEEE] rounded-[14px] overflow-hidden divide-y divide-[#EEEEEE]">
          {notes.slice(0, 5).map((note) => (
            <button
              key={note.id}
              onClick={() => setSelected(note)}
              className="text-left flex items-center gap-4 px-5 py-3 hover:bg-[#F5F5F5]"
            >
              <div className="w-9 h-9 rounded-full bg-[#E8E2FF] shrink-0 flex items-center justify-center">
                <ClipboardList size={16} className="text-[#724BFD]" />
              </div>
              <div className="flex flex-col flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#333333] truncate">
                  {note.title}
                </p>
                <p className="text-[12px] text-[#AAAAAA] truncate">
                  {note.attendees.join(", ")}
                </p>
              </div>
              <p className="text-[11px] text-[#AAAAAA] shrink-0">
                {formatDateTime(note.createdAt)}
              </p>
            </button>
          ))}
        </div>
      )}

      {showAll && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="w-[640px] max-w-full max-h-[80vh] bg-white rounded-[14px] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#EEEEEE]">
              <p className="text-[16px] font-bold text-[#333333]">회의록 전체보기</p>
              <button
                onClick={() => setShowAll(false)}
                title="닫기"
                className="w-8 h-8 flex items-center justify-center text-[#AAAAAA] hover:text-[#333333]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto divide-y divide-[#EEEEEE]">
              {notes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => {
                    setSelected(note);
                    setShowAll(false);
                  }}
                  className="w-full text-left flex items-center gap-4 px-5 py-3 hover:bg-[#F5F5F5]"
                >
                  <div className="w-9 h-9 rounded-full bg-[#E8E2FF] shrink-0 flex items-center justify-center">
                    <ClipboardList size={16} className="text-[#724BFD]" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#333333] truncate">
                      {note.title}
                    </p>
                    <p className="text-[12px] text-[#AAAAAA] truncate">
                      {note.attendeesText || note.attendees.join(", ")}
                    </p>
                  </div>
                  <p className="text-[11px] text-[#AAAAAA] shrink-0">
                    {formatDateTime(note.createdAt)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="w-[520px] max-w-full bg-white rounded-[14px] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#EEEEEE]">
              <p className="text-[16px] font-bold text-[#333333]">회의록 상세</p>
              <button
                onClick={() => setSelected(null)}
                title="닫기"
                className="w-8 h-8 flex items-center justify-center text-[#AAAAAA] hover:text-[#333333]"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 flex flex-col gap-4">
              <div>
                <p className="text-[12px] font-semibold text-[#888888]">제목</p>
                <p className="mt-1 text-[15px] font-semibold text-[#333333]">{selected.title}</p>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-[#888888]">일시</p>
                <p className="mt-1 text-[13px] text-[#555555]">
                  {selected.displayDateTime || `${formatDateTime(selected.startedAt)} - ${formatDateTime(selected.endedAt)}`}
                </p>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-[#888888]">참석자</p>
                <p className="mt-1 text-[13px] text-[#555555] leading-6">
                  {selected.attendeesText || selected.attendees.join(", ")}
                </p>
              </div>
              <div className="rounded-[10px] bg-[#F7F7FA] px-4 py-3">
                <p className="text-[12px] font-semibold text-[#888888]">내용</p>
                <p className="mt-2 whitespace-pre-wrap text-[13px] leading-6 text-[#555555]">
                  {selected.content || "AI가 회의 내용을 채워줄 예정입니다."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
