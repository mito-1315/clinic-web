import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, errMsg } from "../api";
import { PageHead, Section } from "./parts";
import { usePageTitle } from "./site";

type Result = { refCode: string; status: "NEW" | "CONFIRMED" | "CANCELLED" | "COMPLETED"; firstName: string; preferredDate: string; preferredSlot: string; service: string | null; updatedAt: string };

const COPY: Record<Result["status"], [string, string]> = {
  NEW: ["Request received", "Our staff will call you to confirm a time."],
  CONFIRMED: ["Appointment confirmed", "We have noted your visit. Please arrive a few minutes early."],
  COMPLETED: ["Visit completed", "Thank you for visiting. We hope you’re feeling better."],
  CANCELLED: ["Request cancelled", "This request was cancelled. You can send a new one any time."],
};

export function Track() {
  usePageTitle("Track a request");
  const [params] = useSearchParams();
  const [ref, setRef] = useState(params.get("ref") ?? "");
  const [phone, setPhone] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState("");
  const creds = useRef({ refCode: "", phone: "" });

  async function look(quiet = false) {
    if (!quiet) { setBusy(true); setErr(""); }
    try {
      const r = await api<Result>("/appointments/lookup", { method: "POST", body: creds.current });
      setRes(r);
      setChecked(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (e) {
      if (!quiet) { setRes(null); setErr(errMsg(e)); }
    }
    if (!quiet) setBusy(false);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    creds.current = { refCode: ref.trim(), phone: phone.trim() };
    look();
  }

  // Keep the status fresh while the result is on screen (the clinic may confirm it any moment).
  useEffect(() => {
    if (!res) return;
    const id = setInterval(() => { if (document.visibilityState === "visible") look(true); }, 8000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!res]);

  const steps = ["Requested", "Confirmed", "Visit done"];
  const reached = res ? (res.status === "COMPLETED" ? 2 : res.status === "CONFIRMED" ? 1 : res.status === "NEW" ? 0 : -1) : -1;

  return (
    <>
      <PageHead title="Track your request." intro="Enter your reference code and the mobile number you used. This page updates by itself when the clinic confirms." />
      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
          <form onSubmit={submit} className="card space-y-5 self-start p-6 md:p-8">
            <div>
              <label className="label" htmlFor="ref">Reference code</label>
              <input id="ref" className="input uppercase" placeholder="LCC-1001" autoComplete="off" value={ref} onChange={(e) => setRef(e.target.value)} required />
            </div>
            <div>
              <label className="label" htmlFor="ph">Mobile number</label>
              <input id="ph" className="input" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            {err && <p className="text-sm text-red-700" role="alert">{err}</p>}
            <button className="btn btn-primary min-h-12 w-full" disabled={busy}>{busy ? "Checking…" : "Check status"}</button>
            <p className="text-xs text-muted">Demo: try <code>LCC-1001</code> with <code>9000000001</code>.</p>
          </form>

          <div aria-live="polite">
            {res ? (
              <div key={res.status} className="swap rounded-3xl bg-surface p-8 md:p-10">
                <p className="eyebrow">Reference {res.refCode}</p>
                <h2 className={`display mt-3 text-4xl md:text-5xl ${res.status === "CANCELLED" ? "text-red-800" : ""}`}>{COPY[res.status][0]}</h2>
                <p className="mt-3 max-w-md text-lg text-muted">Hello {res.firstName}. {COPY[res.status][1]}</p>

                {reached >= 0 ? (
                  <ol className="mt-8 grid grid-cols-3 gap-2" aria-label="Progress">
                    {steps.map((s, i) => (
                      <li key={s}>
                        <div className={`h-1.5 rounded-full transition-colors duration-500 ${i <= reached ? "bg-brand-600" : "bg-brand-600/15"}`} />
                        <p className={`mt-2 text-sm ${i <= reached ? "font-medium" : "text-muted"}`}>{s}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <Link to="/book" className="btn btn-primary mt-8">Send a new request</Link>
                )}

                <dl className="mt-8 grid grid-cols-2 gap-4 border-t border-line pt-6 text-sm">
                  <div><dt className="text-muted">Preferred day</dt><dd className="text-base">{new Date(res.preferredDate).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" })}</dd></div>
                  <div><dt className="text-muted">Time of day</dt><dd className="text-base">{res.preferredSlot}</dd></div>
                  {res.service && <div className="col-span-2"><dt className="text-muted">Service</dt><dd className="text-base">{res.service}</dd></div>}
                </dl>
                <p className="mt-6 flex items-center gap-2 text-xs text-muted"><span className="size-2 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />Checking for updates every few seconds · last checked {checked}</p>
              </div>
            ) : (
              <div className="grid min-h-64 place-items-center rounded-3xl border border-dashed border-line p-8 text-center text-muted">Your request status will appear here.</div>
            )}
          </div>
        </div>
      </Section>
    </>
  );
}
