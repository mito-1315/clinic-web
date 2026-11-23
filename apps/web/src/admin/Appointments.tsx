import { useEffect, useState } from "react";
import { api, errMsg, useApi } from "../api";
import { Badge, ErrorBox, Loading, PageTitle, Sheet, fmtDate } from "./ui";

const STATUSES = ["NEW", "CONFIRMED", "CANCELLED", "COMPLETED"];

type Appt = {
  id: number; refCode: string; patientName: string; phone: string; patientType: "CHILD" | "ADULT"; age: number;
  preferredDate: string; preferredSlot: string; note: string | null; status: string; staffNote: string | null;
  createdAt: string; service: { title: string } | null;
};

export function Appointments() {
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [date, setDate] = useState("");
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Appt | null>(null);

  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t); }, [q]);
  useEffect(() => setPage(1), [status, type, date, dq]);

  const qs = new URLSearchParams({ page: String(page), limit: "10" });
  if (status) qs.set("status", status);
  if (type) qs.set("patientType", type);
  if (date) qs.set("date", date);
  if (dq) qs.set("q", dq);
  const { data, error, loading, reload } = useApi<{ data: Appt[]; meta: { total: number; totalPages: number } }>(`/admin/appointments?${qs}`, { every: 15_000 });

  return (
    <>
      <PageTitle>Appointment requests</PageTitle>

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by status">
        {["", ...STATUSES].map((s) => (
          <button key={s} onClick={() => setStatus(s)} aria-pressed={status === s}
            className={`btn min-h-10 whitespace-nowrap ${status === s ? "btn-primary" : ""}`}>
            {s ? s[0] + s.slice(1).toLowerCase() : "All"}
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <input className="input" type="search" placeholder="Search name, phone, ref" aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" aria-label="Patient type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Child and adult</option>
          <option value="CHILD">Child</option>
          <option value="ADULT">Adult</option>
        </select>
        <input className="input" type="date" aria-label="Preferred date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {loading && !data ? <Loading /> : error ? <ErrorBox msg={error} retry={reload} /> : (
        <>
          <ul className="space-y-2">
            {data!.data.length === 0 && <li className="card text-center text-stone-500">No requests match these filters.</li>}
            {data!.data.map((a) => (
              <li key={a.id}>
                <button className="card block w-full text-left transition hover:border-brand-500" onClick={() => setOpen(a)}>
                  <span className="flex items-start justify-between gap-3">
                    <span>
                      <span className="block font-semibold">{a.patientName}</span>
                      <span className="text-sm text-stone-600">{a.patientType === "CHILD" ? "Child" : "Adult"}, {a.age} yrs · {a.phone}</span>
                    </span>
                    <Badge status={a.status} />
                  </span>
                  <span className="mt-2 block text-sm text-stone-600">
                    {fmtDate(a.preferredDate)} · {a.preferredSlot}{a.service && ` · ${a.service.title}`} · <span className="font-mono text-xs">{a.refCode}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between text-sm text-stone-600">
            <button className="btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
            <span>Page {page} of {data!.meta.totalPages} · {data!.meta.total} total</span>
            <button className="btn" disabled={page >= data!.meta.totalPages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        </>
      )}

      {open && <Detail a={open} onClose={() => setOpen(null)} onSaved={() => { setOpen(null); reload(); }} />}
    </>
  );
}

function Detail({ a, onClose, onSaved }: { a: Appt; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState(a.status);
  const [note, setNote] = useState(a.staffNote ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [sent, setSent] = useState("");
  async function remind() {
    setBusy(true); setErr(""); setSent("");
    try { await api(`/admin/appointments/${a.id}/remind`, { method: "POST" }); setSent("Reminder sent ✓ (see Alerts for delivery)"); }
    catch (e) { setErr(errMsg(e)); }
    setBusy(false);
  }
  const waText = encodeURIComponent(`Hello ${a.patientName}, this is Lakshmi Child Care Center about your request ${a.refCode} for ${fmtDate(a.preferredDate)} (${a.preferredSlot}).`);
  const waLink = `https://wa.me/${a.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")}?text=${waText}`;

  async function save() {
    setBusy(true); setErr("");
    try {
      await api(`/admin/appointments/${a.id}`, { method: "PATCH", body: { status, staffNote: note.trim() || null } });
      onSaved();
    } catch (e) { setErr(errMsg(e)); setBusy(false); }
  }

  return (
    <Sheet title={a.patientName} onClose={onClose}>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-stone-500">Reference</dt><dd className="font-mono">{a.refCode}</dd>
        <dt className="text-stone-500">Phone</dt><dd><a className="font-semibold text-brand-700 underline" href={`tel:${a.phone}`}>{a.phone}</a></dd>
        <dt className="text-stone-500">Patient</dt><dd>{a.patientType === "CHILD" ? "Child" : "Adult"}, {a.age} yrs</dd>
        <dt className="text-stone-500">Preferred</dt><dd>{fmtDate(a.preferredDate)}, {a.preferredSlot}</dd>
        {a.service && <><dt className="text-stone-500">Service</dt><dd>{a.service.title}</dd></>}
        {a.note && <><dt className="text-stone-500">Note</dt><dd>{a.note}</dd></>}
        <dt className="text-stone-500">Received</dt><dd>{new Date(a.createdAt).toLocaleString("en-IN")}</dd>
      </dl>

      <p className="label mt-5">Status</p>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Status">
        {STATUSES.map((s) => (
          <button key={s} className={`btn ${status === s ? "btn-primary" : ""}`} aria-pressed={status === s} onClick={() => setStatus(s)}>
            {s[0] + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <label className="label mt-4" htmlFor="sn">Staff note (internal)</label>
      <textarea id="sn" className="input" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />

      {err && <p className="mt-3 text-sm text-red-700" role="alert">{err}</p>}
      {sent && <p className="mt-3 text-sm text-brand-700" role="status">{sent}</p>}
      <p className="mt-3 text-xs text-stone-500">Setting a request to Confirmed or Cancelled messages the patient automatically.</p>
      <button className="btn btn-primary mt-4 w-full" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save changes"}</button>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <a className="btn" href={waLink} target="_blank" rel="noreferrer">WhatsApp them</a>
        <button className="btn" disabled={busy} onClick={remind}>Send reminder</button>
      </div>
    </Sheet>
  );
}
