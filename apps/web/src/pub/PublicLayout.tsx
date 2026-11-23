import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useApi } from "../api";
import { useParallaxLayers, useScrolled } from "./motion";
import { ApiStatus } from "./live";
import { SiteCtx, openStatus, telHref, waHref, type Override, type Timing } from "./site";

export const Logo = ({ className = "size-9" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <rect width="48" height="48" rx="24" fill="currentColor" />
    <path d="M24 36s-11-6.600-11-14.500a6.300 6.300 0 0 1 11-4.200 6.300 6.300 0 0 1 11 4.200C35 29.400 24 36 24 36Z" fill="var(--logo-fg, #fff)" />
  </svg>
);

const NAV = [["/about", "About"], ["/doctors", "Doctors"], ["/services", "Services"], ["/contact", "Visit"]] as const;

export function PublicLayout() {
  const { pathname } = useLocation();
  useParallaxLayers(pathname);
  const [menu, setMenu] = useState(false);
  const scrolled = useScrolled(12);
  const settings = useApi<Record<string, string>>("/settings/public");
  const timings = useApi<{ weekly: Timing[]; overrides: Override[] }>("/timings");
  const notices = useApi<{ id: number; title: string; body: string }[]>("/announcements/active");

  useEffect(() => { setMenu(false); window.scrollTo(0, 0); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menu]);

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
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-white focus:px-4 focus:py-2">Skip to content</a>

      <div className={notices.loading ? "min-h-9" : ""}>
        {notices.data?.map((n) => (
          <div key={n.id} className="bg-brand-600 px-4 py-2 text-center text-sm text-white">
            <b className="font-medium">{n.title}:</b> {n.body}
          </div>
        ))}
      </div>

      <header className={`sticky top-0 z-40 pt-[env(safe-area-inset-top)] transition-colors duration-300 ${scrolled ? "border-b border-line bg-paper/90 backdrop-blur" : "border-b border-transparent bg-paper"}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 md:px-8">
          <Link to="/" className="flex items-center gap-2.5 text-brand-600" aria-label={`${name} home`}>
            <Logo className="size-8" />
            <span className="display text-[1.35rem] text-ink">Lakshmi <span className="hidden text-muted sm:inline">Child Care</span></span>
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-8 lg:flex">
            {NAV.map(([to, label]) => (
              <NavLink key={to} to={to} className={({ isActive }) => `ulink pb-0.5 text-[15px] font-medium ${isActive ? "text-brand-600" : "text-ink"}`}>{label}</NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/book" className="btn btn-primary hidden sm:inline-flex">Request appointment</Link>
            <button className="btn lg:hidden" aria-expanded={menu} aria-controls="mnav" onClick={() => setMenu(true)}>Menu</button>
          </div>
        </div>
      </header>

      {menu && (
        <div id="mnav" role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 flex flex-col bg-brand-600 px-6 pb-8 pt-[max(1rem,env(safe-area-inset-top))] text-white">
          <div className="flex h-12 items-center justify-between">
            <span className="display text-xl">Lakshmi Child Care</span>
            <button className="btn border-white/40 text-white hover:bg-white/10" onClick={() => setMenu(false)}>Close</button>
          </div>
          <nav aria-label="Mobile" className="mt-10 flex flex-1 flex-col gap-1">
            {[["/", "Home"], ...NAV].map(([to, label], i) => (
              <NavLink key={to} to={to} end={to === "/"} style={{ ["--i" as string]: i }} className="menu-in display border-b border-white/15 py-3.5 text-4xl">{label}</NavLink>
            ))}
          </nav>
          <Link to="/book" style={{ ["--i" as string]: 6 }} className="menu-in btn btn-light min-h-14 w-full text-base">Request appointment</Link>
        </div>
      )}

      <main id="main" className="pb-20 lg:pb-0">
        {!site.loaded && settings.error && (
          <p className="bg-red-50 p-3 text-center text-sm text-red-700" role="alert">Couldn’t load clinic details. The server may be waking up; please refresh in a few seconds.</p>
        )}
        <Outlet />
      </main>

      <footer className="bg-brand-700 text-white">
        <div className="mx-auto max-w-7xl px-5 py-14 md:px-8 md:py-20">
          <p className="display max-w-3xl text-4xl md:text-6xl">Come in when you’re ready. <em style={{ color: "#e3b59d" }}>We’ll take it from there.</em></p>
          <div className="mt-12 grid gap-10 border-t border-white/15 pt-10 text-[15px] md:grid-cols-4">
            <div className="md:col-span-2">
              <p className="font-medium">{name}</p>
              <p className="mt-2 max-w-xs text-white/75">{s.address}</p>
              {status && <p className="mt-3 inline-flex items-center gap-2 text-white/90"><span className={`size-2 rounded-full ${status.open ? "bg-emerald-400" : "bg-white/40"}`} aria-hidden="true" />{status.text}</p>}
            </div>
            <ul className="space-y-2 text-white/80">
              {[["/", "Home"], ...NAV, ["/book", "Request appointment"], ["/track", "Track a request"], ["/privacy", "Privacy"]].map(([to, label]) => <li key={to}><Link className="ulink" to={to}>{label}</Link></li>)}
            </ul>
            <p className="text-white/75"><span className="font-medium text-white">In an emergency</span><br />Call 108 or go to your nearest hospital. Don’t wait for an appointment reply.</p>
          </div>
          <div className="mt-12 flex flex-col gap-2 border-t border-white/15 pt-6 text-xs text-white/65 md:flex-row md:justify-between">
            <p>Demo website: all names, achievements and details are fictional. · <Link to="/admin" className="ulink">Staff login</Link></p>
            <p className="flex flex-col gap-1 md:items-end"><ApiStatus /><span>Photos: Shixart1985, CC BY 2.0, via Wikimedia Commons.</span></p>
          </div>
        </div>
      </footer>

      {pathname !== "/book" && !menu && (
        <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 gap-2 border-t border-line bg-paper/95 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <a className="btn min-h-12" href={tel}>Call</a>
          <a className="btn min-h-12" href={wa} target="_blank" rel="noreferrer">WhatsApp</a>
          <Link className="btn btn-primary min-h-12" to="/book">Book</Link>
        </div>
      )}
    </SiteCtx.Provider>
  );
}
