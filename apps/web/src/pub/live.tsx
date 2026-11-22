import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, useApi } from "../api";
import { DAYS, fmt12, nowIST } from "./site";

export type Slot = { slot: "Morning" | "Evening"; open: boolean; hours: string | null; booked: number; capacity: number; status: "available" | "few" | "full" | "closed" };
export type Day = { date: string; weekday: number; closed: boolean; reason: string | null; slots: Slot[] };

const hoursText = (h: string | null) => (h ? h.split("-").map(fmt12).join(" – ") : "");
const left = (s: Slot) => Math.max(0, s.capacity - s.booked);

export const statusText = (s: Slot) =>
  s.status === "closed" ? "Not available" : s.status === "full" ? "Fully booked" : s.status === "few" ? `Only ${left(s)} left` : "Available";

const dot = (s: Slot["status"]) => (s === "available" ? "bg-emerald-500" : s === "few" ? "bg-amber-500" : s === "full" ? "bg-red-400" : "bg-stone-300");

function useClock(deps: unknown) {
  const [at, setAt] = useState("");
  useEffect(() => { setAt(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "Asia/Kolkata" })); }, [deps]);
  return at;
}

/** Home section: the next 7 days of live availability, straight from GET /availability. */
export function Availability() {
  const start = nowIST().ymd;
  const { data, error, loading } = useApi<{ days: Day[] }>(`/availability?date=${start}&days=7`, { every: 30_000 });
  const [sel, setSel] = useState<string | null>(null);
  const at = useClock(data);
  const days = data?.days ?? [];
  const day = days.find((d) => d.date === sel) ?? days.find((d) => !d.closed) ?? days[0];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="display max-w-2xl text-4xl md:text-6xl">Pick a time <em>that suits you.</em></h2>
        <p className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm text-muted" aria-live="polite">
          <span className="relative flex size-2.5" aria-hidden="true"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" /></span>
          Live from the clinic{at && <span className="tabular-nums"> · {at}</span>}
        </p>
      </div>

      {error && !data ? (
        <p className="mt-10 rounded-2xl bg-white p-6 text-muted">Live availability is unavailable right now. You can still <Link className="ulink text-brand-600" to="/book">request an appointment</Link>.</p>
      ) : (
        <>
          <ul className="mt-10 grid grid-cols-4 gap-2 sm:grid-cols-7 md:gap-3" aria-label="Next seven days">
            {(loading && !data ? Array.from({ length: 7 }, () => null) : days).map((d, i) =>
              d ? (
                <li key={d.date}>
                  <button onClick={() => setSel(d.date)} aria-pressed={day?.date === d.date} disabled={d.closed && false}
                    className={`lift w-full rounded-2xl border p-3 text-center transition md:p-4 ${day?.date === d.date ? "border-brand-600 bg-brand-600 text-white" : d.closed ? "border-line bg-transparent text-muted" : "border-line bg-white hover:border-brand-600"}`}>
                    <span className="block text-xs font-medium uppercase tracking-wider opacity-80">{i === 0 ? "Today" : DAYS[d.weekday].slice(0, 3)}</span>
                    <span className="display block text-3xl md:text-4xl">{Number(d.date.slice(8))}</span>
                    <span className="mt-1 flex justify-center gap-1.5" aria-hidden="true">
                      {d.slots.map((s) => <span key={s.slot} className={`size-2 rounded-full ${dot(s.status)} ${day?.date === d.date ? "ring-2 ring-white/60" : ""}`} />)}
                    </span>
                  </button>
                </li>
              ) : (
                <li key={i} className="h-28 animate-pulse rounded-2xl bg-surface" />
              ),
            )}
          </ul>

          {day && (
            <div key={day.date} className="swap mt-6 grid gap-3 md:grid-cols-2">
              {day.closed ? (
                <p className="rounded-2xl border border-line bg-white p-6 text-lg md:col-span-2">
                  {DAYS[day.weekday]}: <b className="font-medium">{day.reason ?? "Closed"}</b>. Please pick another day.
                </p>
              ) : (
                day.slots.map((s) => (
                  <div key={s.slot} className={`rounded-2xl border bg-white p-6 ${s.status === "closed" ? "border-line opacity-60" : "border-line"}`}>
                    <div className="flex items-baseline justify-between gap-4">
                      <h3 className="display text-3xl">{s.slot}</h3>
                      <span className="inline-flex items-center gap-2 text-sm"><span className={`size-2 rounded-full ${dot(s.status)}`} aria-hidden="true" />{statusText(s)}</span>
                    </div>
                    <p className="mt-1 text-muted">{s.hours ? hoursText(s.hours) : "No session on this day"}</p>
                    {s.status !== "closed" && (
                      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-brand-100" role="img" aria-label={`${s.booked} of ${s.capacity} places requested`}>
                        <div className={`h-full rounded-full transition-[width] duration-700 ${s.status === "full" ? "bg-red-400" : s.status === "few" ? "bg-amber-500" : "bg-brand-600"}`} style={{ width: `${Math.min(100, (s.booked / s.capacity) * 100)}%` }} />
                      </div>
                    )}
                    {s.open ? (
                      <Link to={`/book?date=${day.date}&slot=${s.slot}`} className="btn btn-primary mt-5">Request this slot <span aria-hidden="true">→</span></Link>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Booking form: Morning / Evening chips that react to the chosen date (GET /availability). */
export function SlotPicker({ date, value, onChange }: { date: string; value: "Morning" | "Evening"; onChange: (s: "Morning" | "Evening") => void }) {
  const [day, setDay] = useState<Day | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!date) { setDay(null); return; }
    let live = true;
    setBusy(true);
    api<{ days: Day[] }>(`/availability?date=${date}`)
      .then((r) => {
        if (!live) return;
        const d = r.days[0];
        setDay(d);
        if (!d.slots.find((s) => s.slot === value)?.open) {
          const first = d.slots.find((s) => s.open);
          if (first) onChange(first.slot);
        }
      })
      .catch(() => live && setDay(null))
      .finally(() => live && setBusy(false));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  if (!date) return <p className="text-sm text-muted">Choose a date to see which times are open.</p>;
  return (
    <div aria-busy={busy}>
      <div className="grid grid-cols-2 gap-3">
        {(day?.slots ?? [{ slot: "Morning" }, { slot: "Evening" }] as Slot[]).map((s) => {
          const slot = s as Slot;
          const disabled = !!day && !slot.open;
          const active = value === slot.slot && !disabled;
          return (
            <button type="button" key={slot.slot} disabled={disabled} aria-pressed={active} onClick={() => onChange(slot.slot)}
              className={`rounded-xl border p-3 text-left transition duration-200 active:scale-[0.98] ${active ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white hover:border-brand-600"} ${disabled ? "cursor-not-allowed opacity-50 hover:border-line" : ""}`}>
              <span className="block font-medium">{slot.slot}</span>
              <span className="block text-xs opacity-80">{day ? (slot.hours ? hoursText(slot.hours) : "Not available") : "…"}</span>
              {day && slot.status !== "closed" && <span className="mt-1 inline-flex items-center gap-1.5 text-xs"><span className={`size-1.5 rounded-full ${dot(slot.status)}`} />{statusText(slot)}</span>}
            </button>
          );
        })}
      </div>
      {day?.closed && <p className="mt-2 text-sm text-red-700" role="alert">{day.reason ?? "Closed"}: please choose another date.</p>}
    </div>
  );
}

/** Footer chip proving the site talks to the live API: calls GET /health and shows the round-trip time. */
export function ApiStatus() {
  const [s, setS] = useState<{ ok: boolean; ms: number } | null>(null);
  useEffect(() => {
    const ping = () => {
      const t = performance.now();
      api("/health").then(() => setS({ ok: true, ms: Math.round(performance.now() - t) })).catch(() => setS({ ok: false, ms: 0 }));
    };
    ping();
    const id = setInterval(ping, 20_000);
    return () => clearInterval(id);
  }, []);
  const docs = ((import.meta.env.VITE_API_URL as string | undefined) ?? "") + "/api/docs";
  return (
    <a href={docs} target="_blank" rel="noreferrer" className="ulink inline-flex items-center gap-2">
      <span className={`size-2 rounded-full ${s ? (s.ok ? "bg-emerald-400" : "bg-red-400") : "bg-white/40"}`} aria-hidden="true" />
      {s ? (s.ok ? `API online · ${s.ms} ms` : "API offline") : "Checking API…"} · API docs
    </a>
  );
}
