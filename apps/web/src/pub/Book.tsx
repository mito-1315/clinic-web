import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError, api, errMsg, useApi } from "../api";
import { PageHead, Section } from "./parts";
import { nowIST, telHref, usePageTitle, useSite, waHref } from "./site";

type Form = { patientName: string; phone: string; patientType: "CHILD" | "ADULT"; age: string; preferredDate: string; preferredSlot: "Morning" | "Evening"; serviceId: string; note: string; consent: boolean; website: string };

const empty: Form = { patientName: "", phone: "", patientType: "CHILD", age: "", preferredDate: "", preferredSlot: "Morning", serviceId: "", note: "", consent: false, website: "" };

export function Book() {
  usePageTitle("Request appointment");
  const { s } = useSite();
  const services = useApi<any[]>("/services");
  const [params] = useSearchParams();
  const [f, setF] = useState<Form>({ ...empty, serviceId: params.get("service") ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formErr, setFormErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ refCode: string } | null>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (f.patientName.trim().length < 2) local.patientName = "Please enter the patient’s name";
    if (!/^(\+91)?[6-9]\d{9}$/.test(f.phone.replace(/[\s-]/g, ""))) local.phone = "Enter a valid 10-digit mobile number";
    if (f.age === "" || Number(f.age) < 0 || Number(f.age) > 120) local.age = "Enter the age in years (0 to 120)";
    if (!f.preferredDate) local.preferredDate = "Choose a preferred date";
    if (!f.consent) local.consent = "Please tick to agree";
    setErrors(local);
    setFormErr("");
    if (Object.keys(local).length) return;

    setBusy(true);
    try {
      const r = await api<{ refCode: string }>("/appointments", {
        method: "POST",
        body: {
          patientName: f.patientName.trim(), phone: f.phone, patientType: f.patientType, age: Number(f.age), preferredDate: f.preferredDate,
          preferredSlot: f.preferredSlot, ...(f.serviceId && { serviceId: Number(f.serviceId) }), ...(f.note.trim() && { note: f.note.trim() }),
          consent: true, website: f.website,
        },
      });
      setDone(r);
    } catch (x) {
      if (x instanceof ApiError && x.details?.length) setErrors(Object.fromEntries(x.details.map((d) => [d.path, d.message])));
      setFormErr(errMsg(x));
    }
    setBusy(false);
  }

  if (done) {
    return (
      <Section>
        <div className="card mx-auto max-w-lg text-center">
          <p className="mx-auto grid size-14 place-items-center rounded-full bg-brand-100 text-2xl text-brand-700" aria-hidden="true">✓</p>
          <h1 className="display mt-3 text-4xl">Request received</h1>
          <p className="mt-2 text-muted">Your reference code is</p>
          <p className="my-2 font-mono text-2xl font-bold">{done.refCode}</p>
          <p className="text-muted">This is a <b>request</b>, not a confirmed booking. Our staff will call you on <b>{f.phone}</b> to confirm a time.</p>
          <div className="mt-5 grid gap-2">
            {waHref(s.whatsapp, `Hello, I requested an appointment. Reference: ${done.refCode}`) && <a className="btn" target="_blank" rel="noreferrer" href={waHref(s.whatsapp, `Hello, I requested an appointment. Reference: ${done.refCode}`)}>Message us on WhatsApp</a>}
            {telHref(s.phone) && <a className="btn" href={telHref(s.phone)}>Call the clinic</a>}
            <Link to="/" className="btn btn-primary">Back to home</Link>
          </div>
          <p className="mt-4 text-xs text-muted">Demo site: no real request was made.</p>
        </div>
      </Section>
    );
  }

  const err = (k: string) => errors[k] && <p id={`${k}-err`} className="mt-1 text-sm text-red-700">{errors[k]}</p>;
  const inv = (k: string) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${k}-err` : undefined });
  const today = nowIST().ymd;

  return (
    <>
      <PageHead title="Request an appointment." intro="Tell us a little and we’ll call to confirm a time. No medical details needed." />
      <Section>
        <form onSubmit={submit} noValidate className="card mx-auto max-w-xl space-y-6 p-6 md:p-9">
          <fieldset>
            <legend className="label">Who is the visit for?</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["CHILD", "ADULT"] as const).map((t) => (
                <button type="button" key={t} aria-pressed={f.patientType === t} onClick={() => set("patientType", t)} className={`btn min-h-12 ${f.patientType === t ? "btn-primary" : ""}`}>{t === "CHILD" ? "Child" : "Adult"}</button>
              ))}
            </div>
          </fieldset>

          <div>
            <label className="label" htmlFor="patientName">Patient name</label>
            <input id="patientName" className="input" autoComplete="name" value={f.patientName} onChange={(e) => set("patientName", e.target.value)} {...inv("patientName")} />
            {err("patientName")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="age">Age (years)</label>
              <input id="age" className="input" inputMode="numeric" value={f.age} onChange={(e) => set("age", e.target.value.replace(/\D/g, "").slice(0, 3))} {...inv("age")} />
              {err("age")}
            </div>
            <div>
              <label className="label" htmlFor="phone">Mobile number</label>
              <input id="phone" className="input" type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} {...inv("phone")} />
              {err("phone")}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="preferredDate">Preferred date</label>
              <input id="preferredDate" className="input" type="date" min={today} value={f.preferredDate} onChange={(e) => set("preferredDate", e.target.value)} {...inv("preferredDate")} />
              {err("preferredDate")}
            </div>
            <div>
              <label className="label" htmlFor="slot">Time of day</label>
              <select id="slot" className="input" value={f.preferredSlot} onChange={(e) => set("preferredSlot", e.target.value as Form["preferredSlot"])}>
                <option>Morning</option>
                <option>Evening</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="service">Service (optional)</label>
            <select id="service" className="input" value={f.serviceId} onChange={(e) => set("serviceId", e.target.value)}>
              <option value="">Not sure / general visit</option>
              {services.data?.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="note">Note (optional)</label>
            <textarea id="note" className="input" rows={3} maxLength={300} value={f.note} onChange={(e) => set("note", e.target.value)} />
            <p className="mt-1 text-xs text-muted">Please don’t share medical details here.</p>
          </div>

          {/* Honeypot: hidden from people, bots fill it in. */}
          <div className="absolute -left-[9999px]" aria-hidden="true">
            <label>Website<input tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set("website", e.target.value)} /></label>
          </div>

          <div>
            <label className="flex items-start gap-3">
              <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-brand-600" checked={f.consent} onChange={(e) => set("consent", e.target.checked)} {...inv("consent")} />
              <span className="text-sm text-ink">I agree that the clinic may use these details to call me about this request. <Link className="underline" to="/privacy" target="_blank">Privacy</Link></span>
            </label>
            {err("consent")}
          </div>

          {formErr && !Object.keys(errors).length && <p className="text-sm text-red-700" role="alert">{formErr}</p>}
          <button className="btn btn-primary min-h-12 w-full text-base" disabled={busy}>{busy ? "Sending…" : "Send request"}</button>
          <p className="text-center text-xs text-muted">For emergencies call 108. Demo site: fictional clinic.</p>
        </form>
      </Section>
    </>
  );
}
