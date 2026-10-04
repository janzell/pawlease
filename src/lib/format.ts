// Dates in the API come in two shapes:
//  - SQLite UTC timestamps "YYYY-MM-DD HH:MM:SS" (created_at, done_at)
//  - user-entered local values "YYYY-MM-DD" / "YYYY-MM-DDTHH:MM" (due dates, bookings)

export function parseUtc(ts: string): Date {
  return new Date(ts.replace(" ", "T") + "Z");
}

export function parseLocal(value: string): Date {
  return value.length === 10 ? new Date(`${value}T00:00`) : new Date(value);
}

const pad = (n: number) => String(n).padStart(2, "0");

export function todayStr(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(date: string, days: number): string {
  const d = parseLocal(date);
  d.setDate(d.getDate() + days);
  return todayStr(d);
}

export function nowLocalInput(d = new Date()): string {
  return `${todayStr(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function timeAgo(date: Date, now = new Date()): string {
  const s = Math.round((now.getTime() - date.getTime()) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d} days ago`;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function friendlyDate(date: string): string {
  if (!date) return "";
  const today = todayStr();
  if (date === today) return "Today";
  if (date === addDays(today, 1)) return "Tomorrow";
  if (date === addDays(today, -1)) return "Yesterday";
  const d = parseLocal(date);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function friendlyTime(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function friendlyDateTime(value: string): string {
  if (!value) return "";
  const [date, time] = value.split("T");
  return time ? `${friendlyDate(date)} · ${friendlyTime(time)}` : friendlyDate(date);
}

export function age(birthday: string, now = new Date()): string {
  if (!birthday) return "";
  const b = parseLocal(birthday);
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months--;
  if (months < 0) return "";
  if (months < 1) return "under 1 month";
  if (months < 24) return `${months} mo`;
  const years = Math.floor(months / 12);
  return `${years} yrs`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function firstName(name: string): string {
  return name.split(" ")[0] ?? name;
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
