import { NavLink, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth";
import { Loading } from "./ui";

const NAV = [
  ["/admin", "Overview", true],
  ["/admin/appointments", "Requests"],
  ["/admin/services", "Services"],
  ["/admin/doctors", "Doctors"],
  ["/admin/announcements", "Notices"],
  ["/admin/notifications", "Alerts"],
  ["/admin/timings", "Timings"],
  ["/admin/settings", "Settings"],
] as const;

const link = ({ isActive }: { isActive: boolean }) =>
  `whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-semibold lg:block ${isActive ? "bg-brand-600 text-white" : "text-stone-700 hover:bg-brand-50"}`;

export function AdminLayout() {
  const { user, ready, logout } = useAuth();
  if (!ready) return <Loading />;
  if (!user) return <Navigate to="/admin/login" replace />;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[230px_1fr]">
      <aside className="border-b border-stone-200 bg-white lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 lg:block lg:pt-5">
          <div>
            <p className="text-base font-bold text-brand-700">Clinic admin</p>
            <p className="text-xs text-stone-500">{user.name}{user.isDemo && " · demo"}</p>
          </div>
          <button className="btn min-h-10 lg:mt-3 lg:w-full" onClick={logout}>Log out</button>
        </div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 pb-2 lg:block lg:space-y-1 lg:pb-0">
          {NAV.map(([to, label, end]) => (
            <NavLink key={to} to={to} end={!!end} className={link}>{label}</NavLink>
          ))}
        </nav>
      </aside>
      <main className="mx-auto w-full max-w-4xl p-4 pb-16 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
