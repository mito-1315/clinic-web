import { useEffect, useState, type FormEvent } from "react";
import { api, errMsg, useApi } from "../api";
import { ErrorBox, Loading, PageTitle, fmtDate } from "./ui";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
type Row = { weekday: number; openTime: string | null; closeTime: string | null; isClosed: boolean; note: string | null };
type Override = { id: number; date: string; reason: string; isClosed: boolean };

export function Timings() {
  const { data, error, loading, reload } = useApi<{ weekly: Row[]; overrides: Override[] }>("/timings");
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [od, setOd] = useState({ date: "", reason: "" });

  useEffect(() => {
    if (!data) return;
    setRows(DAYS.map((_, i) => data.weekly.find((w) => w.weekday === i) ?? { weekday: i, openTime: null, closeTime: null, isClosed: true, note: null }));
  }, [data]);

  const set = (i: number, patch: Partial<Row>) => setRows(rows.map((r, j) => (i === j ? { ...r, ...patch } : r)));

  async function save() {
    setBusy(true); setMsg("");
    try {
      await api("/admin/timings", {
        method: "PUT",
        body: rows.map((r) => ({ ...r, openTime: r.isClosed ? null : r.openTime || null, closeTime: r.isClosed ? null : r.closeTime || null, note: r.note?.trim() || null })),
      });
      setMsg("Saved ✓");
      reload();
    } catch (e) { setMsg(errMsg(e)); }
    setBusy(false);
  }

  async function addOverride(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/admin/timing-overrides", { method: "POST", body: { ...od, isClosed: true } });
      setOd({ date: "", reason: "" });
      reload();
    } catch (x) { setMsg(errMsg(x)); }
  }

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox msg={error} retry={reload} />;

  return (
    <>
      <PageTitle>Opening timings</PageTitle>
      <ul className="space-y-2">
        {rows.map((r, i) => (
          <li key={r.weekday} className="card">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{DAYS[i]}</span>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" className="size-5 accent-brand-600" checked={r.isClosed} onChange={(e) => set(i, { isClosed: e.target.checked })} /> Closed
              </label>
            </div>
            {!r.isClosed && (
              <div className="mt-1 grid grid-cols-2 gap-2">
                <div><label className="label" htmlFor={`o${i}`}>Opens</label><input id={`o${i}`} className="input" type="time" value={r.openTime ?? ""} onChange={(e) => set(i, { openTime: e.target.value })} /></div>
                <div><label className="label" htmlFor={`c${i}`}>Closes</label><input id={`c${i}`} className="input" type="time" value={r.closeTime ?? ""} onChange={(e) => set(i, { closeTime: e.target.value })} /></div>
              </div>
            )}
            <input className="input mt-2" placeholder="Note (optional)" aria-label={`${DAYS[i]} note`} maxLength={120} value={r.note ?? ""} onChange={(e) => set(i, { note: e.target.value })} />
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-3">
        <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save timings"}</button>
        <span className="text-sm text-stone-600" role="status">{msg}</span>
      </div>

      <h2 className="mb-2 mt-10 font-semibold">Holidays and closures</h2>
      <form onSubmit={addOverride} className="card grid gap-2 sm:grid-cols-[auto_1fr_auto]">
        <input className="input" type="date" required aria-label="Date" value={od.date} onChange={(e) => setOd({ ...od, date: e.target.value })} />
        <input className="input" required maxLength={120} placeholder="Reason, e.g. Pongal holiday" aria-label="Reason" value={od.reason} onChange={(e) => setOd({ ...od, reason: e.target.value })} />
        <button className="btn btn-primary">Add closure</button>
      </form>
      <ul className="mt-2 space-y-2">
        {data!.overrides.length === 0 && <li className="text-sm text-stone-500">No upcoming closures.</li>}
        {data!.overrides.map((o) => (
          <li key={o.id} className="card flex items-center justify-between">
            <span><b>{fmtDate(o.date)}</b> · {o.reason}</span>
            <button className="btn btn-danger min-h-10" onClick={async () => { await api(`/admin/timing-overrides/${o.id}`, { method: "DELETE" }); reload(); }}>Remove</button>
          </li>
        ))}
      </ul>
    </>
  );
}
