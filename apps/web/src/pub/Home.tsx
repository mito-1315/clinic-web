import { useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../api";
import { Collapse, WordReveal, useParallax } from "./motion";
import { DoctorCard, Fetched, Section } from "./parts";
import { Availability } from "./live";
import { DAYS, hoursLabel, nowIST, openStatus, telHref, usePageTitle, useSite, waHref } from "./site";

const FAQ: [string, string][] = [
  ["Do I need an appointment?", "You can walk in during opening hours. Requesting an appointment helps us plan; our staff will call to confirm a time. A request is not a confirmed booking until we call you."],
  ["Do you treat adults as well as children?", "Yes. We care for children and adults: fever, cough, infections, routine check-ups and more."],
  ["When is the skin specialist available?", "A visiting dermatologist consults on Saturdays. Request a Saturday slot or call us to check availability."],
  ["What should I bring?", "Earlier prescriptions or reports if you have them, and a child’s vaccination card for vaccination visits."],
  ["What if it is an emergency?", "Call 108 or go to the nearest hospital immediately. Don’t wait for an appointment."],
];

const PHOTOS: [string, string][] = [
  ["smile", "A doctor in teal scrubs smiling while checking a child’s throat"],
  ["teddy", "A stethoscope held to a teddy bear to put a child at ease"],
  ["desk", "A doctor at her desk typing consultation notes"],
  ["throat", "A child having a throat check with a wooden spatula"],
  ["stetho", "A doctor in teal scrubs holding up a stethoscope"],
  ["hero", "A nurse’s hands checking a child’s temperature"],
];

const STEPS = [
  ["Send a request", "Choose a day and time of day in under a minute. We ask only for a name, mobile number, age and a preferred date. No medical history."],
  ["We call you", "A member of our staff phones to confirm a time that suits you, usually the same day."],
  ["Come in and be seen", "Walk in, meet the doctor and nurse, and take the time you need. Children are never rushed."],
  ["Follow-up when needed", "Vaccinations, review visits and the Saturday skin clinic are booked the same way."],
];

function Hero() {
  const { s, weekly, overrides } = useSite();
  const status = openStatus(weekly, overrides);
  const img = useParallax<HTMLImageElement>(0.12);
  const wa = waHref(s.whatsapp);
  return (
    <section className="border-b border-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 pb-12 pt-10 md:min-h-[calc(100svh-4rem)] md:grid-cols-[1.15fr_1fr] md:items-center md:gap-14 md:px-8 md:py-14">
        <div>
          <p className="enter inline-flex min-h-8 items-center gap-2 rounded-full border border-line bg-white px-3.5 py-1 text-sm" style={{ ["--i" as string]: 0 }}>
            <span className={`size-2 rounded-full ${status?.open ? "bg-emerald-500" : "bg-stone-400"}`} aria-hidden="true" />
            {status?.text ?? "Kundrathur, Chennai"}
          </p>
          <h1 className="display enter mt-6 text-[clamp(2.9rem,8.2vw,6.6rem)]" style={{ ["--i" as string]: 1 }}>
            Care for the <em>whole family</em>, close to home.
          </h1>
          <p className="enter mt-6 max-w-lg text-lg text-muted md:text-xl" style={{ ["--i" as string]: 2 }}>
            Children and adults, one trusted clinic in Kundrathur. Two founder-doctors, 30+ years of practice and a Saturday skin clinic.
          </p>
          <div className="enter mt-8 flex flex-wrap gap-3" style={{ ["--i" as string]: 3 }}>
            <Link to="/book" className="btn btn-primary min-h-14 px-7 text-base">Request appointment <span aria-hidden="true">→</span></Link>
            <a className="btn min-h-14 px-7 text-base" href={telHref(s.phone)}>Call {s.phone ?? "us"}</a>
            {wa && <a className="btn hidden min-h-14 px-7 text-base sm:inline-flex" href={wa} target="_blank" rel="noreferrer">WhatsApp</a>}
          </div>
        </div>
        <div className="enter" style={{ ["--i" as string]: 2 }}>
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-brand-100 md:aspect-[4/5]">
            <img ref={img} src="/photos/hero-960.jpg" srcSet="/photos/hero-500.jpg 500w, /photos/hero-960.jpg 960w" sizes="(min-width: 768px) 40vw, 92vw"
              alt="A nurse in teal scrubs holding a thermometer with a child’s hands" className="size-full object-cover will-change-transform" fetchPriority="high" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Statement() {
  return (
    <section className="bg-paper">
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-32">
        <p className="eyebrow">Our approach</p>
        <WordReveal
          className="display mt-6 max-w-5xl text-[clamp(2rem,5vw,4.25rem)]"
          text="A neighbourhood clinic where three decades of experience meet a gentle, unhurried visit. For children, for parents, for grandparents."
        />
      </div>
    </section>
  );
}

function ServicesExplorer({ items }: { items: any[] }) {
  const cats = ["All", ...Array.from(new Set(items.map((i) => i.category as string)))];
  const [cat, setCat] = useState("All");
  const [open, setOpen] = useState<number | null | undefined>(undefined);
  const shown = items.filter((i) => cat === "All" || i.category === cat);
  const active = open === undefined ? shown[0]?.id : open;
  const activeIdx = Math.max(0, items.findIndex((i) => i.id === active));

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
      <div className="lg:sticky lg:top-28 lg:self-start">
        <h2 className="display text-4xl md:text-6xl">Everyday care, <em>every age.</em></h2>
        <p className="mt-4 max-w-sm text-muted">Pick a group, then open a service to read more.</p>
        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter services">
          {cats.map((c) => (
            <button key={c} aria-pressed={cat === c} onClick={() => { setCat(c); setOpen(undefined); }}
              className={`btn min-h-10 px-4 ${cat === c ? "btn-primary" : ""}`}>{c}</button>
          ))}
        </div>
        <Link to="/services" className="ulink mt-8 inline-block font-medium text-brand-600">All services →</Link>
        <div className="relative mt-8 hidden aspect-[4/3] overflow-hidden rounded-3xl bg-brand-100 lg:block">
          {PHOTOS.map(([f, alt], i) => (
            <img key={f} src={`/photos/${f}-960.jpg`} alt={i === activeIdx % PHOTOS.length ? alt : ""} loading="lazy"
              className={`absolute inset-0 size-full object-cover transition-all duration-700 ${i === activeIdx % PHOTOS.length ? "scale-100 opacity-100" : "scale-105 opacity-0"}`} />
          ))}
        </div>
      </div>
      <ul className="border-t border-line">
        {shown.map((s, i) => {
          const isOpen = active === s.id;
          return (
            <li key={s.id} className="border-b border-line">
              <button className="group flex w-full items-center gap-4 py-5 text-left md:gap-6 md:py-6" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : s.id)}>
                <span className="w-8 shrink-0 text-sm tabular-nums text-muted">{String(i + 1).padStart(2, "0")}</span>
                <span className="flex-1">
                  <span className={`display block text-2xl transition-transform duration-300 md:text-3xl ${isOpen ? "" : "group-hover:translate-x-1"}`}>{s.title}</span>
                  <span className="eyebrow mt-1 block">{s.category}</span>
                </span>
                <span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-full border border-line text-xl transition duration-300 ${isOpen ? "rotate-45 border-brand-600 bg-brand-600 text-white" : "group-hover:border-brand-600"}`}>+</span>
              </button>
              <Collapse open={isOpen}>
                <div className="pb-6 pl-12 pr-2 md:pl-14 md:pr-16">
                  <img src={`/photos/${PHOTOS[items.indexOf(s) % PHOTOS.length][0]}-500.jpg`} alt="" loading="lazy" className="mb-4 aspect-[16/9] w-full rounded-2xl object-cover lg:hidden" />
                  <p className="max-w-xl text-muted">{s.description}</p>
                  <Link to={`/book?service=${s.id}`} className="btn mt-4">Request this service <span aria-hidden="true">→</span></Link>
                </div>
              </Collapse>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Visit() {
  const [step, setStep] = useState(0);
  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
      <div>
        <h2 className="display text-4xl md:text-6xl">A visit, <em>step by step.</em></h2>
        <ol className="mt-10 space-y-2">
          {STEPS.map(([t], i) => (
            <li key={t}>
              <button onClick={() => setStep(i)} aria-current={step === i ? "step" : undefined}
                className={`flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left transition duration-200 ${step === i ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white hover:border-brand-600"}`}>
                <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-medium ${step === i ? "bg-white text-brand-700" : "bg-brand-100 text-brand-700"}`}>{i + 1}</span>
                <span className="display text-2xl">{t}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      <div className="flex flex-col justify-between rounded-3xl bg-surface p-8 md:p-12">
        <div key={step} className="swap">
          <span className="display text-[8rem] leading-none text-brand-600/20 md:text-[11rem]" aria-hidden="true">{step + 1}</span>
          <p className="display -mt-4 text-3xl md:text-4xl">{STEPS[step][0]}</p>
          <p className="mt-4 max-w-md text-lg text-muted">{STEPS[step][1]}</p>
        </div>
        <div className="mt-10 flex h-1.5 gap-1.5" aria-hidden="true">
          {STEPS.map((_, i) => <span key={i} className={`flex-1 rounded-full transition-colors duration-300 ${i <= step ? "bg-brand-600" : "bg-brand-600/15"}`} />)}
        </div>
      </div>
    </div>
  );
}

function Hours() {
  const { s, weekly, overrides } = useSite();
  const today = nowIST().weekday;
  const [day, setDay] = useState(today);
  const status = openStatus(weekly, overrides);
  const t = weekly.find((w) => w.weekday === day);
  const order = [1, 2, 3, 4, 5, 6, 0];
  const wa = waHref(s.whatsapp);
  return (
    <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:gap-20">
      <div>
        <p className="eyebrow !text-white/70">Opening hours</p>
        <h2 className="display mt-4 text-4xl md:text-6xl">{day === today ? "Today" : DAYS[day]}</h2>
        <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Choose a day">
          {order.map((d) => (
            <button key={d} aria-pressed={day === d} onClick={() => setDay(d)}
              className={`min-h-11 rounded-full border px-4 text-sm font-medium transition duration-200 active:scale-[0.97] ${day === d ? "border-white bg-white text-brand-700" : "border-white/30 text-white hover:border-white"}`}>
              {DAYS[d].slice(0, 3)}{d === today && " ·"}
            </button>
          ))}
        </div>
        <div key={day} className="swap mt-8">
          <p className="display text-5xl md:text-7xl">{hoursLabel(t)}</p>
          <p className="mt-3 min-h-6 text-white/75">{day === today && status ? status.text : DAYS[day]}{t?.note ? ` · ${t.note}` : ""}</p>
        </div>
      </div>
      <div className="self-end">
        <p className="text-white/80">{s.address}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a className="btn btn-light min-h-12" href={telHref(s.phone)}>Call {s.phone}</a>
          {wa && <a className="btn min-h-12 border-white/40 text-white hover:bg-white/10" href={wa} target="_blank" rel="noreferrer">WhatsApp</a>}
        </div>
        <Link to="/contact" className="ulink mt-6 inline-block text-white">Map and directions →</Link>
      </div>
    </div>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
      <h2 className="display text-4xl md:text-6xl">Good <em>questions.</em></h2>
      <ul className="border-t border-line">
        {FAQ.map(([q, a], i) => (
          <li key={q} className="border-b border-line">
            <button className="flex w-full items-center justify-between gap-6 py-5 text-left" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
              <span className="display text-xl md:text-2xl">{q}</span>
              <span aria-hidden="true" className={`grid size-9 shrink-0 place-items-center rounded-full border border-line text-lg transition duration-300 ${open === i ? "rotate-45 border-brand-600 bg-brand-600 text-white" : ""}`}>+</span>
            </button>
            <Collapse open={open === i}><p className="max-w-xl pb-6 text-muted">{a}</p></Collapse>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Home() {
  usePageTitle("");
  const services = useApi<any[]>("/services");
  const doctors = useApi<any[]>("/doctors");
  return (
    <>
      <Hero />
      <Statement />
      <Section><Availability /></Section>
      <Section tone="surface">
        <Fetched state={services}>{services.data && <ServicesExplorer items={services.data} />}</Fetched>
      </Section>
      <Section title="The people you’ll meet.">
        <Fetched state={doctors}>
          <div className="grid gap-5 md:grid-cols-3">{doctors.data?.map((d) => <DoctorCard key={d.id} d={d} />)}</div>
        </Fetched>
      </Section>
      <Section tone="surface"><Visit /></Section>
      <Section tone="brand"><Hours /></Section>
      <Section><Faq /></Section>
    </>
  );
}
