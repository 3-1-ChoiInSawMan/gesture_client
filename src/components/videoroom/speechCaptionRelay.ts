const PREFIX = "[gesture:stt:v1]";
type Packet = { id: string; part: number; total: number; text: string };

/** Fits the existing chat DTO's 1000-character message limit, including JSON escaping. */
export function encodeSpeechCaption(text: string, id: string): string[] {
  const characters = Array.from(text);
  const parts: string[] = [];
  for (let i = 0; i < characters.length; i += 120) parts.push(characters.slice(i, i + 120).join(""));
  return parts.map((text, part) => PREFIX + JSON.stringify({ id, part, total: parts.length, text }));
}

/** Reassembles by server-supplied sender identity; never trusts a client-supplied name. */
export function createSpeechCaptionReceiver() {
  const pending = new Map<string, { at: number; total: number; parts: Map<number, string> }>();
  const seen = new Map<string, number>();
  return (message: string, sender: number, now = Date.now()): { handled: boolean; text?: string } => {
    if (!message.startsWith(PREFIX)) return { handled: false };
    for (const [key, entry] of pending) if (now - entry.at > 15000) pending.delete(key);
    for (const [key, at] of seen) if (now - at > 60000) seen.delete(key);
    try {
      const p = JSON.parse(message.slice(PREFIX.length)) as Packet;
      if (message.length > 1000 || typeof p.id !== "string" || p.id.length > 64 ||
        !Number.isInteger(p.total) || p.total < 1 || p.total > 256 ||
        !Number.isInteger(p.part) || p.part < 0 || p.part >= p.total || typeof p.text !== "string") return { handled: true };
      const key = `${sender}:${p.id}`;
      if (seen.has(key)) return { handled: true };
      let entry = pending.get(key);
      if (!entry) {
        if (pending.size >= 64) pending.delete(pending.keys().next().value!);
        entry = { at: now, total: p.total, parts: new Map() };
        pending.set(key, entry);
      }
      if (entry.total !== p.total) return { handled: true };
      entry.parts.set(p.part, p.text);
      if (entry.parts.size !== entry.total) return { handled: true };
      const text = Array.from({ length: entry.total }, (_, i) => entry.parts.get(i)!).join("");
      pending.delete(key);
      if (seen.size >= 1024) seen.delete(seen.keys().next().value!);
      seen.set(key, now);
      return { handled: true, text };
    } catch { return { handled: true }; }
  };
}
