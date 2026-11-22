import { useEffect, useState, type FormEvent } from "react";
import { api, errMsg, useApi } from "../api";
import { ErrorBox, Loading, PageTitle } from "./ui";

const FIELDS: [string, string, string?][] = [
  ["name", "Clinic name"],
  ["phone", "Phone (shown on site)"],
  ["whatsapp", "WhatsApp number", "Digits only with country code, e.g. 919876543210"],
  ["email", "Email"],
  ["address", "Address"],
  ["mapUrl", "Map link", "Link to Google Maps or OpenStreetMap"],
];

export function Settings() {
  const { data, error, loading, reload } = useApi<Record<string, string>>("/admin/settings");
  const [form, setForm] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (data) setForm(data); }, [data]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg("");
    const body = Object.fromEntries(FIELDS.map(([k]) => [k, form[k]?.trim()]).filter(([, v]) => v));
    try { await api("/admin/settings", { method: "PUT", body }); setMsg("Saved ✓"); }
    catch (x) { setMsg(errMsg(x)); }
    setBusy(false);
  }

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox msg={error} retry={reload} />;

  return (
    <>
      <PageTitle>Clinic settings</PageTitle>
      <form onSubmit={submit} className="card space-y-4">
        {FIELDS.map(([k, label, hint]) => (
          <div key={k}>
            <label className="label" htmlFor={k}>{label}</label>
            <input id={k} className="input" value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
            {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
          </div>
        ))}
        <div className="flex items-center gap-3">
          <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save settings"}</button>
          <span className="text-sm text-stone-600" role="status">{msg}</span>
        </div>
      </form>
    </>
  );
}
