import { Link } from "react-router-dom";
import { useApi } from "../api";
import { BookCta, DoctorCard, Fetched, Section, ServiceCard, TimingsTable } from "./parts";
import { openStatus, telHref, usePageTitle, useSite, waHref } from "./site";

const FAQ: [string, string][] = [
  ["Do I need an appointment?", "You can walk in during opening hours. Requesting an appointment helps us plan; our staff will call to confirm a time. Requests are not confirmed bookings until we call you."],
  ["Do you treat adults as well as children?", "Yes. We care for children and adults: fever, cough, infections, routine check-ups and more."],
  ["When is the skin specialist available?", "A visiting dermatologist consults on Saturdays. Please request a Saturday slot or call us to check availability."],
  ["What should I bring?", "Previous prescriptions or reports if you have them, and a child’s vaccination card for vaccination visits."],
  ["What if it is an emergency?", "Call 108 or go to the nearest hospital immediately. Do not wait for an appointment."],
];

const POINTS = [
  ["Children and adults", "One trusted clinic for the whole family, from newborn check-ups to adult care."],
  ["Experienced doctors", "Founder-doctors with decades of experience, supported by caring nursing staff."],
  ["Saturday skin clinic", "A visiting dermatologist every Saturday for skin, hair and nail concerns."],
];

const TESTIMONIALS = [
  ["“The doctor was patient with my daughter and explained everything clearly.”", "Sample parent"],
  ["“I have visited for fever and cough for years. Always friendly and quick.”", "Sample patient"],
  ["“Vaccination day was calm and stress free for our baby.”", "Sample parent"],
];

export function Home() {
  usePageTitle("");
  const { s, weekly, overrides } = useSite();
  const services = useApi<any[]>("/services");
  const doctors = useApi<any[]>("/doctors");
  const status = openStatus(weekly, overrides);
  const wa = waHref(s.whatsapp);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-cream">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 md:grid-cols-[1.2fr_1fr] md:py-20">
          <div>
            {status && (
              <p className={`mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${status.open ? "bg-brand-100 text-brand-700" : "bg-stone-200 text-stone-700"}`}>
                <span className={`size-2 rounded-full ${status.open ? "bg-brand-500" : "bg-stone-500"}`} aria-hidden="true" /> {status.text}
              </p>
            )}
            <h1 className="text-4xl font-extrabold leading-tight text-ink md:text-5xl">Caring for your family, <span className="text-brand-600">from first smile to every season.</span></h1>
            <p className="mt-4 max-w-xl text-lg text-stone-600">Lakshmi Child Care Center in Kundrathur, Chennai offers friendly, experienced care for children and adults.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <BookCta className="min-h-12 px-6 text-base" />
              <a className="btn min-h-12 px-6 text-base" href={telHref(s.phone)}>Call {s.phone ?? "us"}</a>
              {wa && <a className="btn min-h-12 px-6 text-base" href={wa} target="_blank" rel="noreferrer">WhatsApp</a>}
            </div>
          </div>
          <div className="hidden md:block" aria-hidden="true">
            <div className="relative mx-auto grid aspect-square max-w-sm place-items-center rounded-[3rem] bg-brand-100">
              <div className="absolute -right-3 top-8 rotate-3 rounded-2xl bg-white px-4 py-3 shadow-md"><b className="text-2xl text-brand-700">30+</b><p className="text-xs text-stone-600">years of care</p></div>
              <div className="absolute -left-3 bottom-12 -rotate-3 rounded-2xl bg-sun-100 px-4 py-3 shadow-md"><b className="text-lg text-amber-800">Saturday</b><p className="text-xs text-stone-700">skin clinic</p></div>
              <svg viewBox="0 0 48 48" className="size-40 text-brand-600"><path d="M24 40s-14-8.500-14-19a8.200 8.200 0 0 1 14-5.800A8.200 8.200 0 0 1 38 21c0 10.500-14 19-14 19Z" fill="currentColor" /><path d="M24 18v10M19 23h10" stroke="#fff" strokeWidth="3" strokeLinecap="round" /></svg>
            </div>
          </div>
        </div>
      </section>

      <Section>
        <div className="grid gap-3 md:grid-cols-3">
          {POINTS.map(([t, d]) => <div key={t} className="card"><h2 className="font-bold text-brand-700">{t}</h2><p className="mt-1 text-sm text-stone-600">{d}</p></div>)}
        </div>
      </Section>

      <Section title="Our services" intro="Everyday care for every age." tint>
        <Fetched state={services}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{services.data?.slice(0, 6).map((x) => <ServiceCard key={x.id} s={x} />)}</div>
        </Fetched>
        <Link to="/services" className="btn mt-5">See all services</Link>
      </Section>

      <Section title="Meet our doctors">
        <Fetched state={doctors}>
          <div className="grid gap-3 md:grid-cols-2">{doctors.data?.map((d) => <DoctorCard key={d.id} d={d} />)}</div>
        </Fetched>
      </Section>

      <Section title="Visit us" tint>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="card"><h3 className="mb-2 font-bold">Opening hours</h3><TimingsTable /></div>
          <div className="card">
            <h3 className="font-bold">Find us</h3>
            <p className="mt-2 text-stone-600">{s.address}</p>
            <Link to="/contact" className="btn mt-4">Map & contact details</Link>
          </div>
        </div>
      </Section>

      <Section title="What families say" intro="Sample testimonials for this demo.">
        <div className="grid gap-3 md:grid-cols-3">
          {TESTIMONIALS.map(([q, who]) => <figure key={q} className="card"><blockquote className="text-stone-700">{q}</blockquote><figcaption className="mt-3 text-sm font-medium text-stone-500">{who}</figcaption></figure>)}
        </div>
      </Section>

      <Section title="Common questions" tint>
        <div className="max-w-3xl space-y-2">
          {FAQ.map(([q, a]) => (
            <details key={q} className="card group">
              <summary className="cursor-pointer list-none font-semibold marker:content-none">{q}</summary>
              <p className="mt-2 text-stone-600">{a}</p>
            </details>
          ))}
        </div>
      </Section>
    </>
  );
}
