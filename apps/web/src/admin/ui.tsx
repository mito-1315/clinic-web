import { useEffect, type ReactNode } from "react";

export const STATUS_STYLE: Record<string, string> = {
  NEW: "bg-sun-100 text-amber-800",
  CONFIRMED: "bg-brand-100 text-brand-700",
  CANCELLED: "bg-red-100 text-red-700",
  COMPLETED: "bg-sky-100 text-sky-800",
};

export const Badge = ({ status }: { status: string }) => (
  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[status] ?? "bg-stone-100"}`}>{status[0] + status.slice(1).toLowerCase()}</span>
);

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export const Loading = () => <p className="p-6 text-center text-stone-500" role="status">Loading…</p>;
export const ErrorBox = ({ msg, retry }: { msg: string; retry?: () => void }) => (
  <div className="card border-red-200 text-center text-red-700" role="alert">
    <p>{msg}</p>
    {retry && <button className="btn mt-3" onClick={retry}>Try again</button>}
  </div>
);

export const PageTitle = ({ children, action }: { children: ReactNode; action?: ReactNode }) => (
  <div className="mb-4 flex items-center justify-between gap-3">
    <h1 className="text-xl font-bold text-brand-700 md:text-2xl">{children}</h1>
    {action}
  </div>
);

/** Bottom sheet on phones, centred dialog on larger screens. Closes on Escape or backdrop tap. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:max-w-lg md:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button className="btn min-h-11 min-w-11 px-0" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
