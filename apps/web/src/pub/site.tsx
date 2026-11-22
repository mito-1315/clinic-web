import { createContext, useContext, useEffect } from "react";

export type Timing = { weekday: number; openTime: string | null; closeTime: string | null; open2Time?: string | null; close2Time?: string | null; isClosed: boolean; note: string | null };
export type Override = { id: number; date: string; isClosed: boolean; openTime: string | null; closeTime: string | null; reason: string };
export type Site = { s: Record<string, string>; weekly: Timing[]; overrides: Override[]; loaded: boolean };

export const SiteCtx = createContext<Site>({ s: {}, weekly: [], overrides: [], loaded: false });
export const useSite = () => useContext(SiteCtx);

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const fmt12 = (t: string | null) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

type Hours = { isClosed: boolean; openTime: string | null; closeTime: string | null; open2Time?: string | null; close2Time?: string | null };
export const sessionsOf = (t?: Hours): [string, string][] =>
  !t || t.isClosed ? [] : ([[t.openTime, t.closeTime], [t.open2Time, t.close2Time]] as const).filter((x): x is readonly [string, string] => !!x[0] && !!x[1]).map((x) => [x[0], x[1]]);

export const hoursLabel = (t: Timing | undefined) => {
  const s = sessionsOf(t);
  return s.length ? s.map(([a, b]) => `${fmt12(a)} – ${fmt12(b)}`).join("  ·  ") : "Closed";
};

/** Current date/time in India, independent of the visitor's device timezone. */
export function nowIST() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date()).map((x) => [x.type, x.value]),
  );
  return { ymd: `${p.year}-${p.month}-${p.day}`, weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday), minutes: Number(p.hour) * 60 + Number(p.minute) };
}

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export function openStatus(weekly: Timing[], overrides: Override[]): { open: boolean; text: string } | null {
  if (!weekly.length) return null;
  const n = nowIST();
  const o = overrides.find((x) => x.date.slice(0, 10) === n.ymd);
  const sessions = sessionsOf(o ?? weekly.find((w) => w.weekday === n.weekday));
  if (!sessions.length) return { open: false, text: o ? `Closed today · ${o.reason}` : "Closed today" };
  for (const [a, b] of sessions) if (n.minutes >= toMin(a) && n.minutes < toMin(b)) return { open: true, text: `Open now · until ${fmt12(b)}` };
  const next = sessions.find(([a]) => n.minutes < toMin(a));
  return next ? { open: false, text: `Opens today at ${fmt12(next[0])}` } : { open: false, text: "Closed for today" };
}

export const telHref = (phone?: string) => (phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : undefined);
export const waHref = (num?: string, text = "Hello, I would like to ask about an appointment.") =>
  num ? `https://wa.me/${num}?text=${encodeURIComponent(text)}` : undefined;

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · Lakshmi Child Care Center` : "Lakshmi Child Care Center · Kundrathur, Chennai";
  }, [title]);
}
