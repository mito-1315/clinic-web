import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../api";
import { Collapse, WordReveal, useParallax, useTilt } from "./motion";
import { DoctorCard, Fetched, Rail, Section } from "./parts";
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
  const tilt = useTilt<HTMLDivElement>(5);
  const wa = waHref(s.whatsapp);
  const box = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => {
    const el = box.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", String((e.clientX - r.left) / r.width - 0.5));
    el.style.setProperty("--my", String((e.clientY - r.top) / r.height - 0.5));
  };
  return (
    <section className="px-3 pt-3 md:px-5 md:pt-4">
      <div ref={box} onPointerMove={move} className="relative mx-auto max-w-[96rem] overflow-hidden rounded-[2rem] bg-brand-700 shadow-[0_30px_70px_-30px_rgb(31_38_28/0.6)] md:min-h-[calc(100svh-6.5rem)]">
        <img ref={img} src="/photos/hero-960.jpg" srcSet="/photos/hero-500.jpg 500w, /photos/hero-960.jpg 960w" sizes="100vw" style={{ scale: 1.14 }}
          alt="A nurse in teal scrubs holding a thermometer with a child’s hands" className="absolute inset-0 size-full object-cover will-change-transform" fetchPriority="high" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1f261c]/90 via-[#1f261c]/55 to-[#1f261c]/20 md:bg-gradient-to-r md:from-[#1f261c]/90 md:via-[#1f261c]/55 md:to-transparent" />
        <div className="blob -left-16 top-1/3 size-72 bg-clay-500" style={{ ["--k" as string]: "-50px" }} aria-hidden="true" />
        <div className="blob -bottom-20 right-1/4 size-80 bg-brand-500" style={{ ["--k" as string]: "60px" }} aria-hidden="true" />
        <div className="relative grid gap-10 p-6 pb-10 pt-40 text-white md:min-h-[calc(100svh-6.5rem)] md:grid-cols-[1.3fr_1fr] md:items-center md:gap-12 md:p-14">
          <div>
            <p className="enter glass-dark inline-flex min-h-8 items-center gap-2 rounded-full px-3.5 py-1 text-sm" style={{ ["--i" as string]: 0 }}>
              <span className={`size-2 rounded-full ${status?.open ? "animate-pulse bg-emerald-400" : "bg-stone-300"}`} aria-hidden="true" />
              {status?.text ?? "Kundrathur, Chennai"}
            </p>
            <h1 className="display enter mt-6 text-[clamp(2.9rem,7.4vw,6.2rem)]" style={{ ["--i" as string]: 1 }}>
              Care for the <em style={{ color: "#f0b392" }}>whole family</em>, close to home.
            </h1>
            <p className="enter mt-6 max-w-lg text-lg text-white/85 md:text-xl" style={{ ["--i" as string]: 2 }}>
              Children and adults, one trusted clinic in Kundrathur. Two founder-doctors, 30+ years of practice and a Saturday skin clinic.
            </p>
            <div className="enter mt-8 flex flex-wrap gap-3" style={{ ["--i" as string]: 3 }}>
              <Link to="/book" className="btn btn-light min-h-14 px-7 text-base">Request appointment <span className="arrow" aria-hidden="true">→</span></Link>
              <a className="btn min-h-14 border-white/50 px-7 text-base text-white hover:bg-white/10" href={telHref(s.phone)}>Call {s.phone ?? "us"}</a>
            </div>
          </div>
          <div className="enter hidden md:block" style={{ ["--i" as string]: 3 }}>
            <div {...tilt} className="tilt glass rounded-3xl p-7 text-ink">
              <p className="eyebrow">Plan your visit</p>
              <p className="display float-3d mt-2 text-4xl">Pick a time of day</p>
              <p className="mt-2 text-sm text-muted">Requests take under a minute. We call to confirm.</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Link to="/book?slot=Morning" className="btn btn-primary">Morning <span className="arrow" aria-hidden="true">→</span></Link>
                <Link to="/book?slot=Evening" className="btn bg-white/70">Evening <span className="arrow" aria-hidden="true">→</span></Link>
              </div>
              {wa && <a className="ulink mt-5 inline-block text-sm font-medium text-brand-700" href={wa} target="_blank" rel="noreferrer">Prefer WhatsApp? Message us</a>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const QUOTES: [string, string][] = [
  ["My son was scared of doctors. Here he walked out with a sticker and a smile.", "Parent of a 5-year-old"],
  ["The same clinic looked after me as a child and now looks after my kids.", "Local resident"],
  ["No rush, no jargon. They explained everything and told us what not to worry about.", "Parent, Kundrathur"],
  ["Evening hours make it possible to come after work. Booking was simple.", "Working parent"],
];

function Testimonials() {
  const rail = useRef<HTMLDivElement>(null);
  const go = (d: number) => rail.current?.scrollBy({ left: d * 360, behavior: "smooth" });
  return (
    <div>
      <div className="flex items-end justify-between gap-6">
        <h2 className="display text-4xl md:text-6xl">Kind <em>words.</em></h2>
        <div className="flex gap-2">
          <button className="btn size-12 !px-0" aria-label="Previous" onClick={() => go(-1)}>←</button>
          <button className="btn size-12 !px-0" aria-label="Next" onClick={() => go(1)}>→</button>
        </div>
      </div>
      
      <div ref={rail} className="rail mt-8" tabIndex={0} aria-label="Patient feedback, scrollable">
        {QUOTES.map(([q, who], i) => (
          <figure key={q} className="lift flex flex-col justify-between rounded-3xl border border-line bg-white p-7">
            <span className="display text-6xl leading-none text-clay-500" aria-hidden="true">“</span>
            <blockquote className="display -mt-4 text-2xl">{q}</blockquote>
            <figcaption className="mt-8 flex items-center gap-3 text-sm text-muted"><span className="grid size-9 place-items-center rounded-full bg-brand-100 text-brand-700">{i + 1}</span>{who}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function ServiceGallery({ items }: { items: any[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const go = (d: number) => rail.current?.scrollBy({ left: d * 360, behavior: "smooth" });
  return (
    <div>
      <div className="flex items-end justify-between gap-6">
        <h2 className="display text-4xl md:text-6xl">Everyday care, <em>every age.</em></h2>
        <div className="flex gap-2">
          <button className="btn size-12 !px-0" aria-label="Previous services" onClick={() => go(-1)}>←</button>
          <button className="btn size-12 !px-0" aria-label="Next services" onClick={() => go(1)}>→</button>
        </div>
      </div>
      <p className="mt-3 max-w-md text-muted">Swipe or use the arrows. Choose a service to request it.</p>
      <div ref={rail} className="rail mt-8" tabIndex={0} aria-label="Services, scrollable">
        {items.map((s, i) => (
          <Link key={s.id} to={`/book?service=${s.id}`} className="lift group flex flex-col overflow-hidden rounded-3xl border border-line bg-white">
            <div className="zoom relative aspect-[4/3] overflow-hidden bg-brand-100">
              <img src={s.imageUrl || `/photos/${PHOTOS[i % PHOTOS.length][0]}-500.jpg`} alt="" loading="lazy" className="size-full object-cover" />
              <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-brand-700">{s.category}</span>
            </div>
            <div className="flex flex-1 flex-col p-5">
              <h3 className="display text-2xl">{s.title}</h3>
              <p className="mt-2 text-[15px] text-muted">{s.description}</p>
              <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-medium text-brand-600">Request this <span className="arrow" aria-hidden="true">→</span></span>
            </div>
          </Link>
        ))}
      </div>
    </div>
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
      <div className="flex flex-col justify-between rounded-3xl bg-surface p-8 shadow-[0_24px_60px_-28px_rgb(31_38_28/0.35)] md:p-12">
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
      <Section tone="surface"><Fetched state={services}>{services.data && <ServiceGallery items={services.data} />}</Fetched></Section>
      <Section title="The people you’ll meet.">
        <Fetched state={doctors}>
          <Rail label="Doctors">{doctors.data?.map((d) => <DoctorCard key={d.id} d={d} />)}</Rail>
        </Fetched>
      </Section>
      <Section tone="surface"><Testimonials /></Section>
      <Section><Visit /></Section>
      <Section tone="brand"><Hours /></Section>
      <Section><Faq /></Section>
    </>
  );
}
