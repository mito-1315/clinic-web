import { Link } from "react-router-dom";
import { useApi } from "../api";
import { Badge, ErrorBox, Loading, PageTitle, fmtDate } from "./ui";

type Stats = { total: number; today: number; byStatus: Record<string, number> };

export function Overview() {
  const stats = useApi<Stats>("/admin/stats");
  const latest = useApi<{ data: any[] }>("/admin/appointments?status=NEW&limit=5");

  if (stats.loading && !stats.data) return <Loading />;
  if (stats.error) return <ErrorBox msg={stats.error} retry={stats.reload} />;
  const s = stats.data!;
  const tiles: [string, number, string][] = [
    ["New requests", s.byStatus.NEW, "bg-sun-100"],
    ["Confirmed", s.byStatus.CONFIRMED, "bg-brand-100"],
    ["Cancelled", s.byStatus.CANCELLED, "bg-red-100"],
    ["Received today", s.today, "bg-sky-100"],
  ];

  return (
    <>
      <PageTitle>Overview</PageTitle>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map(([label, n, bg]) => (
          <div key={label} className={`rounded-2xl p-4 ${bg}`}>
            <p className="text-3xl font-bold">{n}</p>
            <p className="text-sm text-stone-700">{label}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-2 mt-8 font-semibold">Newest requests</h2>
      {latest.loading && !latest.data ? <Loading /> : latest.error ? <ErrorBox msg={latest.error} retry={latest.reload} /> : (
        <ul className="space-y-2">
          {latest.data!.data.length === 0 && <li className="card text-center text-stone-500">No new requests 🎉</li>}
          {latest.data!.data.map((a) => (
            <li key={a.id}>
              <Link to="/admin/appointments" className="card flex items-center justify-between gap-3">
                <span>
                  <span className="block font-semibold">{a.patientName}</span>
                  <span className="text-sm text-stone-600">{fmtDate(a.preferredDate)} · {a.preferredSlot}</span>
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
