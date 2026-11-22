import { Link } from "react-router-dom";
import { useApi } from "../api";
import { WordReveal, useParallax } from "./motion";
import { BookCta, DoctorCard, Fetched, PageHead, Section, ServiceCard, TimingsTable } from "./parts";
import { telHref, usePageTitle, useSite, waHref } from "./site";

export function About() {
  usePageTitle("About");
  const img = useParallax<HTMLImageElement>(0.1);
  return (
    <>
      <PageHead title="A clinic built on patience." intro="A neighbourhood clinic in Kundrathur, run by two doctors who wanted families to have a caring place close to home." />
      <Section>
        <WordReveal
          className="display max-w-5xl text-[clamp(1.9rem,4.2vw,3.5rem)]"
          text="Over three decades we have looked after children, their parents and often their grandparents. Fever, cough, vaccination, check-ups and minor procedures, with a visiting skin specialist every Saturday."
        />
      </Section>
      <Section tone="surface">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-brand-100">
            <img ref={img} src="/photos/hero-960.jpg" alt="A nurse’s hands checking a child’s temperature" loading="lazy" className="size-full object-cover" />
          </div>
          <div>
            <h2 className="display text-4xl md:text-5xl">Recognition and memberships</h2>
            <p className="mt-2 text-sm text-muted">Sample content for this demo.</p>
            <ul className="mt-8 divide-y divide-line border-y border-line">
              {["Active member of a state paediatric association", "Community vaccination camps for local schools", "Invited speaker at regional medical education meetings", "Long-standing referral relationships with specialists across Chennai"].map((x, i) => (
                <li key={x} className="flex gap-5 py-5"><span className="display text-2xl text-brand-500">{String(i + 1).padStart(2, "0")}</span><span className="text-lg">{x}</span></li>
              ))}
            </ul>
          </div>
        </div>
      </Section>
      <Section title="What we value.">
        <div className="grid gap-5 md:grid-cols-3">
          {[["Listening first", "We take time to hear your concerns and explain in plain language."], ["Gentle with children", "Calm, friendly visits so little ones feel safe."], ["Honest advice", "We recommend only what is needed, and refer you when specialist care is better."]].map(([t, d]) => (
            <div key={t} className="lift card"><h3 className="display text-2xl">{t}</h3><p className="mt-2 text-muted">{d}</p></div>
          ))}
        </div>
        <BookCta className="mt-10 min-h-14 px-7 text-base" />
      </Section>
    </>
  );
}

export function Services() {
  usePageTitle("Services");
  const state = useApi<any[]>("/services");
  const groups = new Map<string, any[]>();
  state.data?.forEach((s) => groups.set(s.category, [...(groups.get(s.category) ?? []), s]));
  return (
    <>
      <PageHead title="Our services." intro="Care for children and adults, all under one roof." />
      <Section>
        <Fetched state={state}>
          {[...groups].map(([cat, items]) => (
            <div key={cat} className="mb-14 grid gap-6 lg:grid-cols-[1fr_3fr]">
              <h2 className="display text-3xl text-brand-600">{cat}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {items.map((s) => (
                  <Link key={s.id} to={`/book?service=${s.id}`} className="block"><ServiceCard s={s} /></Link>
                ))}
              </div>
            </div>
          ))}
        </Fetched>
        <BookCta className="min-h-14 px-7 text-base" />
      </Section>
    </>
  );
}

export function Doctors() {
  usePageTitle("Doctors");
  const state = useApi<any[]>("/doctors");
  return (
    <>
      <PageHead title="Doctors and team." intro="Experienced doctors and a caring nursing team. Profiles are sample content." />
      <Section>
        <Fetched state={state}>
          <div className="grid gap-5 md:grid-cols-3">{state.data?.map((d) => <DoctorCard key={d.id} d={d} />)}</div>
        </Fetched>
        <div className="mt-8 rounded-3xl bg-surface p-8 md:p-10">
          <h2 className="display text-3xl">Nursing team</h2>
          <p className="mt-2 max-w-2xl text-muted">Trained nurses assist with check-ups, injections, dressings and vaccination, and are your first point of contact during every visit.</p>
        </div>
      </Section>
    </>
  );
}

export function Contact() {
  usePageTitle("Visit & contact");
  const { s } = useSite();
  const wa = waHref(s.whatsapp);
  const map = s.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Kundrathur, Chennai")}`;
  return (
    <>
      <PageHead title="Visit and contact." intro="We’re happy to hear from you." />
      <Section>
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-8">
            <div>
              <p className="eyebrow">Address</p>
              <p className="display mt-2 text-3xl">{s.address}</p>
              <a className="btn mt-4" href={map} target="_blank" rel="noreferrer">Get directions →</a>
            </div>
            <div className="flex flex-wrap gap-3">
              {s.phone && <a className="btn btn-primary min-h-12" href={telHref(s.phone)}>Call {s.phone}</a>}
              {wa && <a className="btn min-h-12" href={wa} target="_blank" rel="noreferrer">WhatsApp</a>}
              {s.email && <a className="btn min-h-12" href={`mailto:${s.email}`}>{s.email}</a>}
            </div>
            <div>
              <p className="eyebrow mb-2">Opening hours</p>
              <TimingsTable />
            </div>
          </div>
          <div>
            <iframe title="Map of Kundrathur, Chennai (approximate)" loading="lazy" className="h-96 w-full rounded-3xl border border-line lg:h-full lg:min-h-[34rem]"
              src="https://www.openstreetmap.org/export/embed.html?bbox=80.085%2C12.990%2C80.110%2C13.008&layer=mapnik&marker=12.9985%2C80.0985" />
            <p className="mt-2 text-xs text-muted">Kundrathur area, approximate sample location. Map by OpenStreetMap contributors.</p>
          </div>
        </div>
      </Section>
    </>
  );
}

export function Privacy() {
  usePageTitle("Privacy");
  return (
    <>
      <PageHead title="Privacy." intro="A plain-language summary of how appointment requests are handled on this demo site." />
      <Section>
        <div className="max-w-3xl space-y-8 text-lg">
          {[
            ["What we collect", "When you request an appointment: your name, mobile number, whether the patient is a child or adult, age, preferred date and time, and an optional short note. We do not ask for medical history, diagnoses or reports. Please don’t put medical details in the note."],
            ["Why", "Only so clinic staff can call you to confirm a time. Your data is not sold, shared for marketing, or used for advertising."],
            ["Who can see it", "Authorised clinic staff using the admin dashboard."],
            ["How long we keep it", "Appointment requests are kept for about 90 days and then deleted. You can ask the clinic to delete yours sooner by calling with your reference code."],
            ["Cookies and third parties", "This site sets no tracking or advertising cookies. Fonts load from Google Fonts and the map from OpenStreetMap, which may receive your IP address when they load."],
          ].map(([h, p]) => <div key={h}><h2 className="display text-2xl">{h}</h2><p className="mt-2 text-muted">{p}</p></div>)}
          <div className="rounded-2xl bg-sun-100 p-5 text-base"><b className="font-medium">Demo notice:</b> this is a demonstration website with fictional content. Please don’t submit real personal details unless you are the developer testing it. <Link className="ulink" to="/book">Back to the appointment form</Link></div>
        </div>
      </Section>
    </>
  );
}
