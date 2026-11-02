/**
 * Daily reminders as a calendar file (.ics). Websites can't send scheduled notifications while
 * closed (iPhone especially), but a phone calendar alert fires reliably, so Seen adds the
 * reminders there. Times are "floating" (no time zone), so they ring at the same local time anywhere.
 */
export type ReminderSettings = {
  /** Morning sunscreen, "HH:MM". */
  sunscreen?: string;
  /** Midday reapply, "HH:MM". */
  reapply?: string;
  /** Water every N hours between `waterFrom` and `waterTo`. */
  waterEvery?: number;
  waterFrom?: string;
  waterTo?: string;
  /** First day, "YYYYMMDD" (the user's local date). */
  start: string;
};

export const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const DATE_RE = /^\d{8}$/;

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const fromMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}${String(m % 60).padStart(2, "0")}`;

/** Water times from `from` to `to` (inclusive) every `every` hours. */
export function waterTimes(from: string, to: string, every: number): string[] {
  const out: string[] = [];
  for (let m = toMin(from); m <= toMin(to) && out.length < 12; m += every * 60) out.push(fromMin(m));
  return out;
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

function event(uid: string, start: string, hhmm: string, title: string, body: string, stamp: string): string[] {
  return [
    "BEGIN:VEVENT",
    `UID:${uid}@shine`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}T${hhmm}00`,
    "DURATION:PT5M",
    "RRULE:FREQ=DAILY",
    `SUMMARY:${esc(title)}`,
    `DESCRIPTION:${esc(body)}`,
    "TRANSP:TRANSPARENT",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:PT0M",
    `DESCRIPTION:${esc(title)}`,
    "END:VALARM",
    "END:VEVENT",
  ];
}

export function buildReminderCalendar(s: ReminderSettings, now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Seen//Daily reminders//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Seen reminders"];
  if (s.sunscreen && TIME_RE.test(s.sunscreen)) {
    lines.push(
      ...event(`sunscreen-${s.start}`, s.start, s.sunscreen.replace(":", ""), "☀ Apply sunscreen", "SPF 30+ on face, neck and ears. Daily sunscreen is the biggest factor in fading dark marks.", stamp),
    );
  }
  if (s.reapply && TIME_RE.test(s.reapply)) {
    lines.push(...event(`reapply-${s.start}`, s.start, s.reapply.replace(":", ""), "☀ Reapply sunscreen", "Outdoors or by a window? Reapply your SPF.", stamp));
  }
  if (s.waterEvery && s.waterFrom && s.waterTo && TIME_RE.test(s.waterFrom) && TIME_RE.test(s.waterTo)) {
    for (const t of waterTimes(s.waterFrom, s.waterTo, s.waterEvery)) {
      lines.push(...event(`water-${t}-${s.start}`, s.start, t, "💧 Drink a glass of water", "A small daily habit. Seen reminder.", stamp));
    }
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** RFC 5545: lines longer than 75 bytes continue on the next line, starting with a space. */
function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (enc.encode(cur + ch).length > (parts.length ? 74 : 75)) {
      parts.push(cur);
      cur = "";
    }
    cur += ch;
  }
  parts.push(cur);
  return parts.join("\r\n ");
}
