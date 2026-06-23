"use client";

export interface MeetingNoteRecord {
  id: string;
  userId: string;
  roomId: string;
  roomTitle: string;
  title: string;
  startedAt: string;
  endedAt: string;
  attendees: string[];
  createdAt: string;
}

const STORAGE_KEY = "gesture_meeting_notes_v1";

function readAllNotes(): MeetingNoteRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAllNotes(notes: MeetingNoteRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function getMeetingNotes(userId?: string | null): MeetingNoteRecord[] {
  const notes = readAllNotes();
  if (!userId) return notes;
  return notes.filter((note) => note.userId === userId);
}

export function saveMeetingNote(note: Omit<MeetingNoteRecord, "id" | "createdAt">) {
  const now = new Date().toISOString();
  const record: MeetingNoteRecord = {
    ...note,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
  };
  writeAllNotes([record, ...readAllNotes()]);
  return record;
}
