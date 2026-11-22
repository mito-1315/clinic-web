import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ErrorBox } from "../admin/ui";
import { DAYS, hoursLabel, nowIST, useSite } from "./site";

export const Section = ({ title, intro, children, tint }: { title?: string; intro?: string; children: ReactNode; tint?: boolean }) => (
  <section className={tint ? "bg-brand-50" : ""}>
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      {title && <h2 className="text-2xl font-bold text-brand-700 md:text-3xl">{title}</h2>}
      {intro && <p className="mt-2 max-w-2xl text-stone-600">{intro}</p>}
      <div className={title ? "mt-6" : ""}>{children}</div>
    </div>
  </section>
);

export const PageHead = ({ title, intro }: { title: string; intro?: string }) => (
  <div className="bg-brand-50">
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <h1 className="text-3xl font-bold text-brand-700 md:text-4xl">{title}</h1>
      {intro && <p className="mt-3 max-w-2xl text-lg text-stone-600">{intro}</p>}
    </div>
  </div>
);

export const Skeletons = ({ n = 3 }: { n?: number }) => (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
    {Array.from({ length: n }, (_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-stone-200/70" />)}
  </div>
);

export const Fetched = ({ state, children }: { state: { data: any; error: string; loading: boolean; reload: () => void }; children: ReactNode }) =>
  state.error && !state.data ? <ErrorBox msg={state.error} retry={state.reload} /> : state.loading && !state.data ? <Skeletons /> : <>{children}</>;

export const initials = (name: string) =>
  name.replace(/^Dr\.?\s*/i, "").split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export function DoctorCard({ d }: { d: any }) {
  return (
    <article className="card flex gap-4">
      {d.photoUrl ? (
        <img src={d.photoUrl} alt="" loading="lazy" className="size-16 shrink-0 rounded-full object-cover" />
      ) : (
        <div className="grid size-16 shrink-0 place-items-center rounded-full bg-brand-100 text-lg font-bold text-brand-700" aria-hidden="true">{initials(d.name)}</div>
      )}
      <div>
        <h3 className="font-bold">{d.name}</h3>
        <p className="text-sm font-medium text-brand-700">{d.role}</p>
        <p className="text-sm text-stone-600">{d.qualification} · {d.experienceYears}+ yrs</p>
        {d.visitingDays && <p className="mt-1 inline-block rounded-full bg-sun-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">Visits: {d.visitingDays}</p>}
        <p className="mt-2 text-sm text-stone-600">{d.bio}</p>
      </div>
    </article>
  );
}

export function ServiceCard({ s }: { s: any }) {
  return (
    <article className="card">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{s.category}</p>
      <h3 className="mt-1 font-bold">{s.title}</h3>
      <p className="mt-1 text-sm text-stone-600">{s.description}</p>
    </article>
  );
}

export function TimingsTable() {
  const { weekly, overrides } = useSite();
  if (!weekly.length) return <Skeletons n={1} />;
  const today = nowIST().weekday;
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <>
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Weekly opening hours</caption>
        <tbody>
          {order.map((d) => {
            const t = weekly.find((w) => w.weekday === d);
            return (
              <tr key={d} className={`border-b border-stone-100 ${d === today ? "bg-brand-50 font-semibold" : ""}`}>
                <th scope="row" className="py-2.5 pl-2 pr-3 font-medium">{DAYS[d]}{d === today && <span className="ml-2 text-xs text-brand-700">today</span>}</th>
                <td className="py-2.5">{hoursLabel(t)}{t?.note && <span className="block text-xs font-normal text-stone-600">{t.note}</span>}</td>
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

export const BookCta = ({ className = "" }: { className?: string }) => <Link to="/book" className={`btn btn-primary ${className}`}>Request appointment</Link>;
