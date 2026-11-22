import { prisma } from "./db";

export const SLOT_CAPACITY = Number(process.env.SLOT_CAPACITY ?? 12);
const FEW_LEFT = 3;

export type SlotInfo = {
  slot: "Morning" | "Evening";
  open: boolean;
  hours: string | null;
  booked: number;
  capacity: number;
  status: "available" | "few" | "full" | "closed";
};
export type DayInfo = { date: string; weekday: number; closed: boolean; reason: string | null; slots: SlotInfo[] };

const todayUtc = () => new Date(new Date().toISOString().slice(0, 10));
const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** Availability for `days` consecutive days from `from` (UTC date strings). Closed days, holidays and past days have no open slots. */
export async function getAvailability(from: string, days = 1): Promise<DayInfo[]> {
  const start = new Date(from);
  const end = new Date(start.getTime() + (days - 1) * 86400000);
  const [timings, overrides, counts] = await Promise.all([
    prisma.timing.findMany(),
    prisma.timingOverride.findMany({ where: { date: { gte: start, lte: end } } }),
    prisma.appointment.groupBy({
      by: ["preferredDate", "preferredSlot"],
      where: { preferredDate: { gte: start, lte: end }, status: { not: "CANCELLED" } },
      _count: true,
    }),
  ]);
  const today = todayUtc();
  const out: DayInfo[] = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const key = ymd(d);
    const weekday = d.getUTCDay();
    const o = overrides.find((x) => ymd(x.date) === key);
    const t = timings.find((x) => x.weekday === weekday);
    const past = d < today;
    const closedAllDay = past || !!o?.isClosed || !t || t.isClosed;
    const reason = past ? "This date has passed" : o?.isClosed ? o.reason : !t || t.isClosed ? "Closed" : null;

    const sessions: Record<SlotInfo["slot"], string | null> = {
      Morning: !closedAllDay && (o?.openTime ?? t?.openTime) && (o?.closeTime ?? t?.closeTime) ? `${o?.openTime ?? t!.openTime}-${o?.closeTime ?? t!.closeTime}` : null,
      Evening: !closedAllDay && !o && t?.open2Time && t.close2Time ? `${t.open2Time}-${t.close2Time}` : null,
    };

    const slots = (["Morning", "Evening"] as const).map((slot): SlotInfo => {
      const booked = counts.find((c) => ymd(c.preferredDate) === key && c.preferredSlot === slot)?._count ?? 0;
      const hours = sessions[slot];
      const left = SLOT_CAPACITY - booked;
      const status = !hours ? "closed" : left <= 0 ? "full" : left <= FEW_LEFT ? "few" : "available";
      return { slot, open: status === "available" || status === "few", hours, booked, capacity: SLOT_CAPACITY, status };
    });
    out.push({ date: key, weekday, closed: slots.every((s) => s.status === "closed"), reason, slots });
  }
  return out;
}
