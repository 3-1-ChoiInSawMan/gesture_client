"use client";

import { useEffect, useMemo, useState } from "react";
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
    minute: "2-digit",
  }).format(new Date(value));
}

function buildLocalDraft(note: MeetingNoteRecord): MeetingNoteRecord {
  return {
    ...note,
    attendeesText: note.attendeesText || note.attendees.join(", "),
  };
}

function mergeServerMinutes(
  base: MeetingNoteRecord,
  minutes: MeetingMinutes
): MeetingNoteRecord {
  const attendees = minutes.participants ?? base.attendees;
  const conclusion = minutes.conclusion ?? base.conclusion;
  const contentParts = [
    minutes.content,
    minutes.aiSummary,
    conclusion?.filter(Boolean).length
      ? conclusion.filter((item): item is string => Boolean(item)).join("\n")
      : null,
  ].filter((item): item is string => Boolean(item));

  return {
    ...base,
    minutesIdx: minutes.minutesIdx,
    callIdx: minutes.callIdx,
    roomIdx: minutes.roomIdx,
    title: minutes.title ?? base.title,
    startedAt: minutes.startedAt ?? minutes.meetingDate ?? base.startedAt,
    endedAt: minutes.endedAt ?? base.endedAt,
    attendees,
    attendeesText: attendees.join(", "),
    content: contentParts.join("\n\n") || base.content,
    aiSummary: minutes.aiSummary,
    conclusion,
    status: minutes.status,
  };
}

function toNoteFromServer(
  userId: string,
  roomTitle: string,
  roomIdx: number,
  item: { minutesIdx: number; callIdx: number; title: string; meetingDate: string; status: "IN_PROGRESS" | "ENDED" },
  details?: MeetingMinutes
): MeetingNoteRecord {
  const attendees = details?.participants ?? [];
  return {
    id: `server-${item.minutesIdx}`,
    minutesIdx: item.minutesIdx,
    callIdx: item.callIdx,
    roomIdx,
    userId,
    roomId: String(roomIdx),
    roomTitle,
    title: details?.title ?? item.title,
    startedAt: details?.startedAt ?? item.meetingDate,
    endedAt: details?.endedAt ?? item.meetingDate,
    attendees,
    attendeesText: attendees.join(", "),
    content: details?.content ?? details?.aiSummary ?? undefined,
    aiSummary: details?.aiSummary ?? null,
    conclusion: details?.conclusion ?? [],
    status: details?.status ?? item.status,
    createdAt: details?.meetingDate ?? item.meetingDate,
  };
}

export default function MeetingNotes({ userId }: MeetingNotesProps) {
  const [notes, setNotes] = useState<MeetingNoteRecord[]>([]);
  const [selected, setSelected] = useState<MeetingNoteRecord | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const localNotes = useMemo(
    () => getMeetingNotes(userId).map(buildLocalDraft),
    [userId]
  );

  useEffect(() => {
    let cancelled = false;

    const loadNotes = async () => {
      setIsLoading(true);
      try {
        const localByMinutesIdx = new Map<number, MeetingNoteRecord>();
        const localByRoomIdx = new Map<number, MeetingNoteRecord>();

        localNotes.forEach((note) => {
          if (typeof note.minutesIdx === "number") {
            localByMinutesIdx.set(note.minutesIdx, note);
          }
          const resolvedRoomIdx =
            typeof note.roomIdx === "number" && Number.isFinite(note.roomIdx)
              ? note.roomIdx
              : Number(note.roomId);
          if (Number.isFinite(resolvedRoomIdx) && !localByRoomIdx.has(resolvedRoomIdx)) {
            localByRoomIdx.set(resolvedRoomIdx, note);
          }
        });

        const roomIdxs = Array.from(localByRoomIdx.keys());
        const roomResults = await Promise.all(
          roomIdxs.map(async (roomIdx) => {
            const roomNotes = await meetingApi.getRoomMinutes(roomIdx).catch(() => []);
            return { roomIdx, roomNotes };
          })
        );

        const serverNotes: MeetingNoteRecord[] = [];
        for (const { roomIdx, roomNotes } of roomResults) {
          const roomTitle = localByRoomIdx.get(roomIdx)?.roomTitle || `통화방 ${roomIdx}`;
          for (const item of roomNotes) {
            const local = localByMinutesIdx.get(item.minutesIdx);
            const base =
              local ??
              toNoteFromServer(userId, roomTitle, roomIdx, item);
            let note = base;

            if (!local) {
              try {
                const details = await meetingApi.getMinutes(item.minutesIdx);
                note = mergeServerMinutes(base, details);
              } catch {
                note = base;
              }
            }

            serverNotes.push(note);
          }
        }

        const localOnly = localNotes.filter((note) => !note.minutesIdx);
        const merged = [...serverNotes, ...localOnly].sort((a, b) => {
          const right = new Date(b.startedAt || b.createdAt).getTime();
          const left = new Date(a.startedAt || a.createdAt).getTime();
          return right - left;
        });

        if (!cancelled) setNotes(merged);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadNotes();
    return () => {
      cancelled = true;
    };
  }, [localNotes, userId]);

  const visibleNotes = showAll ? notes : notes.slice(0, 5);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList size={17} className="text-[#724BFD]" />
          <p className="text-[16px] font-bold text-[#333333]">회의록</p>
        </div>
        {notes.length > 5 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="text-[13px] text-[#724BFD]"
          >
            전체보기
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center border border-[#EEEEEE] rounded-[14px] min-h-[96px]">
          <p className="text-[13px] text-[#AAAAAA]">회의록을 불러오는 중입니다.</p>
        </div>
      ) : notes.length === 0 ? (
        <div className="flex items-center justify-center border border-[#EEEEEE] rounded-[14px] min-h-[96px]">
          <p className="text-[13px] text-[#AAAAAA]">저장된 회의록이 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col border border-[#EEEEEE] rounded-[14px] overflow-hidden divide-y divide-[#EEEEEE]">
          {visibleNotes.map((note) => (
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
                  {note.attendeesText || note.attendees.join(", ")}
                </p>
              </div>
              <p className="text-[11px] text-[#AAAAAA] shrink-0">
                {formatDateTime(note.createdAt || note.startedAt)}
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
                    {formatDateTime(note.createdAt || note.startedAt)}
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
                <p className="text-[12px] font-semibold text-[#888888]">시간</p>
                <p className="mt-1 text-[13px] text-[#555555]">
                  {selected.displayDateTime ||
                    `${formatDateTime(selected.startedAt)} - ${formatDateTime(selected.endedAt)}`}
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
                  {selected.content || "저장된 회의 내용이 없습니다."}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
