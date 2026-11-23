import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../api";
import { Badge, ErrorBox, Loading, PageTitle, fmtDate } from "./ui";

type Stats = { total: number; today: number; byStatus: Record<string, number>; last7: { date: string; count: number }[] };

export function Overview() {
  const stats = useApi<Stats>("/admin/stats", { every: 15_000 });
  const latest = useApi<{ data: any[] }>("/admin/appointments?status=NEW&limit=5", { every: 15_000 });
  const prevNew = useRef<number | null>(null);
  const [flash, setFlash] = useState("");
  const [at, setAt] = useState("");

  useEffect(() => {
    if (!stats.data) return;
    setAt(new Date().toLocaleTimeString("en-IN"));
    const n = stats.data.byStatus.NEW;
    if (prevNew.current !== null && n > prevNew.current) {
      setFlash(`${n - prevNew.current} new request${n - prevNew.current > 1 ? "s" : ""} just arrived`);
      const t = setTimeout(() => setFlash(""), 6000);
      prevNew.current = n;
      return () => clearTimeout(t);
    }
    prevNew.current = n;
  }, [stats.data]);

  if (stats.loading && !stats.data) return <Loading />;
  if (stats.error && !stats.data) return <ErrorBox msg={stats.error} retry={stats.reload} />;
  const s = stats.data!;
  const max = Math.max(1, ...s.last7.map((d) => d.count));
  const tiles: [string, number, string][] = [
    ["New requests", s.byStatus.NEW, "bg-sun-100"],
    ["Confirmed", s.byStatus.CONFIRMED, "bg-brand-100"],
    ["Completed", s.byStatus.COMPLETED, "bg-surface"],
    ["Received today", s.today, "bg-surface"],
  ];

  return (
    <>
      <PageTitle action={<span className="inline-flex items-center gap-2 text-sm text-muted"><span className="size-2 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />Live · {at}</span>}>Overview</PageTitle>
      {flash && <p className="swap mb-4 rounded-xl bg-brand-600 px-4 py-3 text-white" role="status">{flash}</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map(([label, n, bg]) => (
          <div key={label} className={`rounded-2xl p-4 ${bg}`}>
            <p className="display text-4xl">{n}</p>
            <p className="text-sm text-muted">{label}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-2 mt-8 font-semibold">Requests, last 7 days</h2>
      <div className="card flex h-48 items-stretch gap-2 md:gap-4" role="img" aria-label={`Requests per day: ${s.last7.map((d) => d.count).join(", ")}`}>
        {s.last7.map((d) => (
          <div key={d.date} className="flex flex-1 flex-col items-center justify-end gap-1">
            <span className="text-xs tabular-nums text-muted">{d.count}</span>
            <div className="w-full rounded-t-lg bg-clay-500 transition-[height,background-color] hover:bg-clay-600 duration-700" style={{ height: `${(d.count / max) * 100}%`, minHeight: 4, opacity: d.count ? 1 : 0.2 }} />
            <span className="text-xs text-muted">{new Date(d.date).toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" })}</span>
          </div>
        ))}
      </div>

      <h2 className="mb-2 mt-8 font-semibold">Newest requests</h2>
      {latest.loading && !latest.data ? <Loading /> : latest.error && !latest.data ? <ErrorBox msg={latest.error} retry={latest.reload} /> : (
        <ul className="space-y-2">
          {latest.data!.data.length === 0 && <li className="card text-center text-muted">No new requests</li>}
          {latest.data!.data.map((a) => (
            <li key={a.id}>
              <Link to="/admin/appointments" className="card lift flex items-center justify-between gap-3">
                <span>
                  <span className="block font-medium">{a.patientName}</span>
                  <span className="text-sm text-muted">{fmtDate(a.preferredDate)} · {a.preferredSlot}</span>
                </span>
                <Badge status={a.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
