import type { Booking } from "../../shared/types.ts";

// Builds a single-event .ics file so a booking can be added to any calendar.
// Times are written as floating local times, which matches how they were entered.

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => `\\${m}`);
const stamp = (local: string) => local.replace(/[-:]/g, "") + "00";

export function bookingToIcs(b: Booking, extra: { petName?: string; proName?: string } = {}): string {
  const start = b.starts_at;
  const end = b.ends_at || addHour(b.starts_at);
  const desc = [extra.petName && `Pet: ${extra.petName}`, extra.proName && `With: ${extra.proName}`, b.notes].filter(Boolean).join("\n");
  const now = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Pawlease//Bookings//EN",
    "BEGIN:VEVENT",
    `UID:booking-${b.id}@pawlease`,
    `DTSTAMP:${now}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(b.title)}`,
    b.location && `LOCATION:${esc(b.location)}`,
    desc && `DESCRIPTION:${esc(desc)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(b.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

function addHour(local: string): string {
  const d = new Date(local);
  d.setHours(d.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function downloadIcs(b: Booking, extra: { petName?: string; proName?: string }) {
  const blob = new Blob([bookingToIcs(b, extra)], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${b.title.replace(/[^\w\- ]+/g, "").trim() || "booking"}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
