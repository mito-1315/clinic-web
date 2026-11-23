import { useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ErrorBox } from "../admin/ui";
import { useReveal, useTilt } from "./motion";
import { DAYS, hoursLabel, nowIST, openStatus, useSite } from "./site";

export const Section = ({ title, intro, children, tone = "paper", className = "" }: { title?: string; intro?: string; children: ReactNode; tone?: "paper" | "surface" | "brand"; className?: string }) => {
  const rv = useReveal<HTMLDivElement>();
  const bg = tone === "surface" ? "bg-surface" : tone === "brand" ? "bg-brand-600 text-white" : "";
  return (
    <section className={`relative overflow-hidden ${bg} ${className}`}>
      {tone !== "brand" && <><i className="deco -left-24 top-10 size-72 bg-brand-500/20" data-parallax="-0.16" aria-hidden="true" /><i className="deco -right-20 bottom-0 size-80 bg-clay-500/15" data-parallax="0.12" aria-hidden="true" /></>}
      <div ref={rv} className="reveal relative mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
        {title && <h2 className="display max-w-3xl text-4xl md:text-6xl">{title}</h2>}
        {intro && <p className={`mt-4 max-w-xl text-lg ${tone === "brand" ? "text-white/80" : "text-muted"}`}>{intro}</p>}
        <div className={title ? "mt-10 md:mt-14" : ""}>{children}</div>
      </div>
    </section>
  );
};

export const PageHead = ({ title, intro }: { title: string; intro?: string }) => (
  <div className="border-b border-line">
    <div className="mx-auto max-w-7xl px-5 pb-12 pt-14 md:px-8 md:pb-16 md:pt-24">
      <h1 className="display enter max-w-4xl text-5xl md:text-7xl">{title}</h1>
      {intro && <p className="enter mt-5 max-w-xl text-lg text-muted" style={{ ["--i" as string]: 1 }}>{intro}</p>}
    </div>
  </div>
);

export const Skeletons = ({ n = 3 }: { n?: number }) => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
    {Array.from({ length: n }, (_, i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-surface" />)}
  </div>
);

export const Fetched = ({ state, children }: { state: { data: any; error: string; loading: boolean; reload: () => void }; children: ReactNode }) =>
  state.error && !state.data ? <ErrorBox msg={state.error} retry={state.reload} /> : state.loading && !state.data ? <Skeletons /> : <>{children}</>;

export const initials = (name: string) =>
  name.replace(/^Dr\.?\s*/i, "").replace(/^Sample\s+/i, "").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export function DoctorCard({ d }: { d: any }) {
  const { weekly, overrides } = useSite();
  const status = openStatus(weekly, overrides);
  const todayName = DAYS[nowIST().weekday];
  const todayOpen = !!status && !status.text.startsWith("Closed today");
  const tilt = useTilt<HTMLElement>(4);
  const onDuty = todayOpen && (!d.visitingDays || String(d.visitingDays).includes(todayName));
  return (
    <article {...tilt} className="tilt lift group overflow-hidden rounded-3xl border border-line bg-white">
      <div className="zoom relative aspect-[4/3] overflow-hidden bg-brand-100">
        {d.photoUrl ? (
          <img src={d.photoUrl} alt={`Portrait of ${d.name}`} loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center" aria-hidden="true">
            <span className="display text-8xl text-brand-600/80">{initials(d.name)}</span>
          </div>
        )}
        {d.visitingDays && <span className="absolute left-4 top-4 rounded-full bg-sun-100 px-3 py-1 text-xs font-medium text-amber-900">Visits {d.visitingDays}s</span>}
        <Link to="/book" className="reveal-up glass absolute inset-x-3 bottom-3 flex items-center justify-between px-4 py-3 text-sm font-medium text-brand-700" style={{ borderRadius: "1rem" }}>Book with this team <span className="arrow" aria-hidden="true">→</span></Link>
        {onDuty && <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-medium text-brand-700"><span className="size-2 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />In clinic today</span>}
      </div>
      <div className="p-6">
        <h3 className="display text-3xl">{d.name}</h3>
        <p className="mt-1 text-[15px] font-medium text-brand-600">{d.role}</p>
        <p className="text-sm text-muted">{d.qualification} · {d.experienceYears}+ years</p>
        <p className="mt-4 text-[15px] text-ink/80">{d.bio}</p>
      </div>
    </article>
  );
}

export function ServiceCard({ s, big = false }: { s: any; big?: boolean }) {
  return (
    <article className={`lift group flex h-full flex-col justify-between rounded-3xl border p-6 ${big ? "border-brand-700 bg-brand-600 text-white md:p-9" : "border-line bg-white"}`}>
      <div>
        {s.imageUrl && <img src={s.imageUrl} alt="" loading="lazy" className="mb-4 aspect-[16/9] w-full rounded-2xl object-cover" />}
        <p className={`eyebrow ${big ? "!text-white/70" : "!text-brand-600"}`}>{s.category}</p>
        <h3 className={`display mt-2 ${big ? "text-4xl md:text-5xl" : "text-2xl"}`}>{s.title}</h3>
        <p className={`mt-3 text-[15px] ${big ? "max-w-sm text-white/80" : "text-muted"}`}>{s.description}</p>
      </div>
      <span className={`mt-6 inline-flex items-center gap-2 text-sm font-medium ${big ? "text-white" : "text-brand-600"}`}>Request this <span className="arrow" aria-hidden="true">→</span></span>
    </article>
  );
}

export function TimingsTable({ light = false }: { light?: boolean }) {
  const { weekly, overrides } = useSite();
  if (!weekly.length) return <Skeletons n={1} />;
  const today = nowIST().weekday;
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <>
      <table className="w-full text-left text-[15px]">
        <caption className="sr-only">Weekly opening hours</caption>
        <tbody>
          {order.map((d) => {
            const t = weekly.find((w) => w.weekday === d);
            return (
              <tr key={d} className={`border-b ${light ? "border-white/15" : "border-line"} ${d === today ? "font-medium" : ""}`}>
                <th scope="row" className="py-3 pr-3 font-normal">{DAYS[d]}{d === today && <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${light ? "bg-white/15" : "bg-brand-100 text-brand-700"}`}>today</span>}</th>
                <td className="py-3 text-right">{hoursLabel(t)}{t?.note && <span className="block text-xs font-normal opacity-70">{t.note}</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {overrides.length > 0 && (
        <ul className="mt-3 space-y-1 text-sm text-amber-800">
          {overrides.map((o) => <li key={o.id}>Closed {new Date(o.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}: {o.reason}</li>)}
        </ul>
      )}
    </>
  );
}

export const BookCta = ({ className = "", light = false }: { className?: string; light?: boolean }) => (
  <Link to="/book" className={`btn ${light ? "btn-light" : "btn-primary"} ${className}`}>Request appointment <span className="arrow" aria-hidden="true">→</span></Link>
);

/** Horizontally scrollable row (swipe, trackpad, or the arrow buttons), snapping card by card. */
export function Rail({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const go = (d: number) => ref.current?.scrollBy({ left: d * Math.max(280, (ref.current?.clientWidth ?? 600) * 0.8), behavior: "smooth" });
  return (
    <div>
      <div ref={ref} className="rail" tabIndex={0} aria-label={label}>{children}</div>
      <div className="mt-1 flex items-center justify-between gap-3">
        <p className="text-sm text-muted">Swipe or use the arrows to see more.</p>
        <div className="flex gap-2">
          <button className="btn size-11 !px-0" aria-label={`${label}: previous`} onClick={() => go(-1)}>←</button>
          <button className="btn size-11 !px-0" aria-label={`${label}: next`} onClick={() => go(1)}>→</button>
        </div>
      </div>
    </div>
  );
}
