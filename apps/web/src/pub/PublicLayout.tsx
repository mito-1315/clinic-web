import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useApi } from "../api";
import { SiteCtx, openStatus, telHref, waHref, type Override, type Timing } from "./site";

export const Logo = ({ className = "size-9" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <rect width="48" height="48" rx="14" fill="var(--color-brand-600)" />
    <path d="M24 37s-11-6.6-11-15a6.5 6.5 0 0 1 11-4.6A6.5 6.5 0 0 1 35 22c0 8.400-11 15-11 15Z" fill="#fff" />
    <path d="M24 19v8M20 23h8" stroke="var(--color-brand-600)" strokeWidth="2.600" strokeLinecap="round" />
  </svg>
);

const NAV = [["/", "Home"], ["/about", "About"], ["/doctors", "Doctors"], ["/services", "Services"], ["/contact", "Visit & contact"]] as const;
const link = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? "bg-brand-100 text-brand-700" : "text-stone-700 hover:bg-brand-50"}`;

export function PublicLayout() {
  const { pathname } = useLocation();
  const [menu, setMenu] = useState(false);
  const settings = useApi<Record<string, string>>("/settings/public");
  const timings = useApi<{ weekly: Timing[]; overrides: Override[] }>("/timings");
  const notices = useApi<{ id: number; title: string; body: string }[]>("/announcements/active");

  useEffect(() => { setMenu(false); window.scrollTo(0, 0); }, [pathname]);

  const site = useMemo(
    () => ({ s: settings.data ?? {}, weekly: timings.data?.weekly ?? [], overrides: timings.data?.overrides ?? [], loaded: !!settings.data }),
    [settings.data, timings.data],
  );
  const s = site.s;
  const status = openStatus(site.weekly, site.overrides);
  const tel = telHref(s.phone);
  const wa = waHref(s.whatsapp);
  const name = s.name ?? "Lakshmi Child Care Center";

  return (
    <SiteCtx.Provider value={site}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">Skip to content</a>

      {/* Reserve the banner's height while loading so the page doesn't jump (layout shift). */}
      <div className={notices.loading ? "min-h-9" : ""}>
        {notices.data?.map((n) => (
          <div key={n.id} className="bg-sun-100 px-4 py-2 text-center text-sm text-amber-900">
            <b>{n.title}:</b> {n.body}
          </div>
        ))}
      </div>

      <header className="sticky top-0 z-40 border-b border-stone-200 bg-cream/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <Link to="/" className="flex items-center gap-2.5" aria-label={`${name} home`}>
            <Logo />
            <span className="leading-tight">
              <span className="block text-[15px] font-bold text-brand-700">Lakshmi</span>
              <span className="block text-xs font-medium text-stone-600">Child Care Center</span>
            </span>
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {NAV.map(([to, label]) => <NavLink key={to} to={to} end={to === "/"} className={link}>{label}</NavLink>)}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/book" className="btn btn-primary hidden min-h-10 sm:inline-flex">Request appointment</Link>
            <button className="btn min-h-10 px-3 lg:hidden" aria-expanded={menu} aria-controls="mnav" onClick={() => setMenu(!menu)}>{menu ? "Close" : "Menu"}</button>
          </div>
        </div>
        {menu && (
          <nav id="mnav" aria-label="Mobile" className="border-t border-stone-200 bg-white px-3 py-2 lg:hidden">
            {NAV.map(([to, label]) => <NavLink key={to} to={to} end={to === "/"} className={(a) => link(a) + " block py-3 text-base"}>{label}</NavLink>)}
            <Link to="/book" className="btn btn-primary my-2 w-full">Request appointment</Link>
          </nav>
        )}
      </header>

      <main id="main" className="pb-24 lg:pb-0">
        {!site.loaded && settings.error && (
          <p className="bg-red-50 p-3 text-center text-sm text-red-700" role="alert">Couldn’t load clinic details. The server may be waking up; please refresh in a few seconds.</p>
        )}
        <Outlet />
      </main>

      <footer className="border-t border-stone-200 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
          <div>
            <p className="flex items-center gap-2 font-bold text-brand-700"><Logo className="size-8" /> {name}</p>
            <p className="mt-3 text-sm text-stone-600">{s.address}</p>
            {status && <p className={`mt-2 text-sm font-semibold ${status.open ? "text-brand-700" : "text-stone-600"}`}>{status.text}</p>}
          </div>
          <div className="text-sm">
            <p className="mb-2 font-semibold">Explore</p>
            <ul className="space-y-1.5 text-stone-600">
              {NAV.map(([to, label]) => <li key={to}><Link className="hover:text-brand-700" to={to}>{label}</Link></li>)}
              <li><Link className="hover:text-brand-700" to="/book">Request appointment</Link></li>
              <li><Link className="hover:text-brand-700" to="/privacy">Privacy</Link></li>
            </ul>
          </div>
          <div className="text-sm text-stone-600">
            <p className="mb-2 font-semibold text-ink">In an emergency</p>
            <p>Please call <b>108</b> or go to your nearest hospital. Do not wait for an appointment reply.</p>
          </div>
        </div>
        <div className="border-t border-stone-100 bg-sun-100/60 px-4 py-3 text-center text-xs text-stone-700">
          Demo website: all names, achievements and details are fictional samples. · <Link to="/admin" className="underline">Staff login</Link>
        </div>
      </footer>

      {pathname !== "/book" && (
        <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 gap-2 border-t border-stone-200 bg-white/95 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <a className="btn min-h-12" href={tel} aria-disabled={!tel}>Call</a>
          <a className="btn min-h-12" href={wa} target="_blank" rel="noreferrer" aria-disabled={!wa}>WhatsApp</a>
          <Link className="btn btn-primary min-h-12" to="/book">Book</Link>
        </div>
      )}
    </SiteCtx.Provider>
  );
}
