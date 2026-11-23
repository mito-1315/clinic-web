import { useEffect, useState } from "react";
import { api, errMsg, useApi } from "../api";
import { ErrorBox, Loading, PageTitle } from "./ui";

type Row = { id: number; channel: "WHATSAPP" | "EMAIL"; to: string; kind: string; body: string; status: "SENT" | "FAILED" | "DRY_RUN"; error: string | null; createdAt: string };
type Data = { providers: Record<string, boolean>; data: Row[] };

const CHANNELS: [string, string, string][] = [
  ["WHATSAPP", "WhatsApp", "notifyWhatsApp"],
  ["EMAIL", "Email", "notifyEmailOn"],
];
const KIND: Record<string, string> = { NEW_REQUEST: "New request", CONFIRMED: "Confirmed", CANCELLED: "Cancelled", REMINDER: "Reminder", TEST: "Test" };
/** Plain-language help for the errors a new Twilio account usually hits. */
const hint = (e: string) =>
  e.includes("21654") || e.includes("ContentSid") ? "WhatsApp needs an approved message template (set TWILIO_WHATSAPP_CONTENT_SID), or use the join-code sandbox."
  : e.includes("21608") || e.includes("unverified") ? "Trial accounts can only message verified numbers. Verify this number in the Twilio console."
  : e.includes("63015") || e.includes("63016") ? "This number has not joined the WhatsApp sandbox yet. Send the join code from that phone first."
  : "";

const STATUS_STYLE = { SENT: "bg-emerald-100 text-emerald-800", FAILED: "bg-red-100 text-red-700", DRY_RUN: "bg-stone-100 text-stone-600" };

export function Notifications() {
  const log = useApi<Data>("/admin/notifications", { every: 15_000 });
  const cfg = useApi<Record<string, string>>("/admin/settings");
  const [form, setForm] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (cfg.data) setForm(cfg.data); }, [cfg.data]);
  const on = (k: string) => form[k] !== "off";

  async function save(patch: Record<string, string>) {
    const next = { ...form, ...patch };
    setForm(next);
    setBusy(true); setMsg("");
    const body = Object.fromEntries(["notifyPhone", "notifyEmail", "notifyWhatsApp", "notifyEmailOn", "remindersOn"].map((k) => [k, next[k]?.trim()]).filter(([, v]) => v));
    try { await api("/admin/settings", { method: "PUT", body }); setMsg("Saved ✓"); }
    catch (e) { setMsg(errMsg(e)); }
    setBusy(false);
  }

  async function run(path: string, ok: (r: any) => string) {
    setBusy(true); setMsg("");
    try { setMsg(ok(await api(path, { method: "POST" }))); log.reload(); }
    catch (e) { setMsg(errMsg(e)); }
    setBusy(false);
  }

  if ((log.loading && !log.data) || (cfg.loading && !cfg.data)) return <Loading />;
  if (log.error && !log.data) return <ErrorBox msg={log.error} retry={log.reload} />;
  const d = log.data!;
  const live = Object.values(d.providers).some(Boolean);

  return (
    <>
      <PageTitle>Alerts</PageTitle>
      <p className="mb-4 max-w-2xl text-sm text-stone-600">
        Every new request alerts the clinic by WhatsApp and email together. Patients get a message when a request is confirmed or cancelled, and a reminder the day before their visit.
      </p>
      {!live && <p className="mb-4 rounded-xl bg-sun-100 px-4 py-3 text-sm text-amber-900" role="status">No message provider is connected yet, so messages below are shown as “Not sent (demo)”. Add the keys listed in the README to start sending for real.</p>}

      <div className="card">
        <h2 className="font-semibold">Where alerts go</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div><label className="label" htmlFor="np">Staff WhatsApp number</label><input id="np" className="input" inputMode="tel" placeholder="+919876543210" value={form.notifyPhone ?? ""} onChange={(e) => setForm({ ...form, notifyPhone: e.target.value })} onBlur={() => form.notifyPhone && save({})} /></div>
          <div><label className="label" htmlFor="ne">Staff email</label><input id="ne" className="input" type="email" placeholder="owner@clinic.com" value={form.notifyEmail ?? ""} onChange={(e) => setForm({ ...form, notifyEmail: e.target.value })} onBlur={() => form.notifyEmail && save({})} /></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Channels">
          {CHANNELS.map(([ch, label, key]) => (
            <button key={ch} aria-pressed={on(key)} onClick={() => save({ [key]: on(key) ? "off" : "on" })}
              className={`btn min-h-10 ${on(key) ? "btn-primary" : ""}`}>{label}: {on(key) ? "On" : "Off"}{d.providers[ch] ? "" : " (demo)"}</button>
          ))}
          <button aria-pressed={on("remindersOn")} onClick={() => save({ remindersOn: on("remindersOn") ? "off" : "on" })}
            className={`btn min-h-10 ${on("remindersOn") ? "btn-primary" : ""}`}>Patient reminders: {on("remindersOn") ? "On" : "Off"}</button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button className="btn" disabled={busy} onClick={() => run("/admin/notifications/test", (r) => `Test sent on ${r.channels} channel${r.channels === 1 ? "" : "s"}`)}>Send test alert</button>
          <button className="btn" disabled={busy} onClick={() => run("/admin/reminders/run", (r) => `${r.sent} reminder${r.sent === 1 ? "" : "s"} sent`)}>Send tomorrow’s reminders now</button>
          <span className="text-sm text-stone-600" role="status">{msg}</span>
        </div>
      </div>

      <h2 className="mb-2 mt-8 font-semibold">Recent messages</h2>
      <ul className="space-y-2">
        {d.data.length === 0 && <li className="card text-center text-stone-500">Nothing sent yet.</li>}
        {d.data.map((r) => (
          <li key={r.id} className="card">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-brand-100 px-2.5 py-0.5 font-semibold text-brand-700">{r.channel === "WHATSAPP" ? "WhatsApp" : r.channel === "EMAIL" ? "Email" : r.channel}</span>
              <span className="font-semibold">{KIND[r.kind] ?? r.kind}</span>
              <span className={`rounded-full px-2.5 py-0.5 font-semibold ${STATUS_STYLE[r.status]}`}>{r.status === "DRY_RUN" ? "Not sent (demo)" : r.status === "SENT" ? "Sent" : "Failed"}</span>
              <span className="text-stone-500">to {r.to} · {new Date(r.createdAt).toLocaleString("en-IN")}</span>
            </div>
            <p className="mt-2 text-sm text-stone-700">{r.body}</p>
            {r.error && <p className="mt-1 text-xs text-red-700">{hint(r.error) && <b>{hint(r.error)} </b>}<span className="opacity-70">{r.error}</span></p>}
          </li>
        ))}
      </ul>
    </>
  );
}
