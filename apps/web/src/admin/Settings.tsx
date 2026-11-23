import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, errMsg, useApi } from "../api";
import { useAuth } from "../auth";
import { ErrorBox, Loading, PageTitle } from "./ui";

const FIELDS: [string, string, string?][] = [
  ["name", "Clinic name"],
  ["phone", "Phone (shown on site)"],
  ["whatsapp", "WhatsApp number", "Digits only with country code, e.g. 919876543210"],
  ["email", "Email"],
  ["address", "Address"],
  ["mapUrl", "Map link", "Link to Google Maps or OpenStreetMap"],
];

function ChangePassword() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ cur: "", next: "", again: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (f.next.length < 10) return setMsg("Use at least 10 characters.");
    if (f.next !== f.again) return setMsg("The two new passwords do not match.");
    setBusy(true); setMsg("");
    try {
      await api("/auth/password", { method: "PATCH", body: { currentPassword: f.cur, newPassword: f.next } });
      logout(); // every old session stops working when the password changes
      nav("/admin/login", { replace: true });
    } catch (x) { setMsg(errMsg(x)); setBusy(false); }
  }

  if (user?.isDemo) return <p className="mt-8 text-sm text-stone-500">The demo account's password cannot be changed.</p>;
  return (
    <form onSubmit={submit} className="card mt-8 space-y-4">
      <h2 className="font-semibold">Change password</h2>
      <div><label className="label" htmlFor="cp0">Current password</label><input id="cp0" className="input" type="password" autoComplete="current-password" required value={f.cur} onChange={(e) => setF({ ...f, cur: e.target.value })} /></div>
      <div><label className="label" htmlFor="cp1">New password (10+ characters)</label><input id="cp1" className="input" type="password" autoComplete="new-password" required minLength={10} value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} /></div>
      <div><label className="label" htmlFor="cp2">New password again</label><input id="cp2" className="input" type="password" autoComplete="new-password" required value={f.again} onChange={(e) => setF({ ...f, again: e.target.value })} /></div>
      <div className="flex items-center gap-3">
        <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Change password"}</button>
        <span className="text-sm text-red-700" role="alert">{msg}</span>
      </div>
      <p className="text-xs text-stone-500">You will be signed out and asked to sign in with the new password.</p>
    </form>
  );
}

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
      <ChangePassword />
    </>
  );
}
