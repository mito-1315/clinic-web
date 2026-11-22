import { Link } from "react-router-dom";
import { useApi } from "../api";
import { BookCta, DoctorCard, Fetched, PageHead, Section, ServiceCard, TimingsTable } from "./parts";
import { telHref, usePageTitle, useSite, waHref } from "./site";

export function About() {
  usePageTitle("About");
  return (
    <>
      <PageHead title="About the clinic" intro="A neighbourhood clinic in Kundrathur, built on trust, patience and experience." />
      <Section>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4 text-stone-700">
            <p>Lakshmi Child Care Center was founded by two doctors who wanted families in Kundrathur to have a caring clinic close to home. Over three decades, we have looked after children, their parents and often their grandparents.</p>
            <p>Today the clinic treats children and adults alike for everyday illnesses such as fever, cough and infections, along with vaccination, routine check-ups and minor procedures. A visiting skin specialist joins us every Saturday.</p>
            <p>Our nursing team supports every visit, so families feel looked after from the moment they walk in.</p>
          </div>
          <div className="card">
            <h2 className="font-bold text-brand-700">Recognition and memberships</h2>
            <p className="text-xs text-stone-500">Sample content for this demo.</p>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-stone-700">
              <li>Active member of a state paediatric association (sample)</li>
              <li>Community vaccination camps for local schools (sample)</li>
              <li>Invited speaker at regional medical education meetings (sample)</li>
              <li>Long-standing referral relationships with specialists across Chennai (sample)</li>
            </ul>
          </div>
        </div>
      </Section>
      <Section title="What we value" tint>
        <div className="grid gap-3 md:grid-cols-3">
          {[["Listening first", "We take time to hear your concerns and explain in plain language."], ["Gentle with children", "Calm, friendly visits so little ones feel safe."], ["Honest advice", "We recommend only what is needed, and refer you when specialist care is better."]].map(([t, d]) => (
            <div key={t} className="card"><h3 className="font-bold">{t}</h3><p className="mt-1 text-sm text-stone-600">{d}</p></div>
          ))}
        </div>
        <BookCta className="mt-6" />
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
      <PageHead title="Our services" intro="Care for children and adults, all under one roof." />
      <Section>
        <Fetched state={state}>
          {[...groups].map(([cat, items]) => (
            <div key={cat} className="mb-8">
              <h2 className="mb-3 text-lg font-bold text-brand-700">{cat}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((s) => <ServiceCard key={s.id} s={s} />)}</div>
            </div>
          ))}
        </Fetched>
        <BookCta />
      </Section>
    </>
  );
}

export function Doctors() {
  usePageTitle("Doctors");
  const state = useApi<any[]>("/doctors");
  return (
    <>
      <PageHead title="Doctors and team" intro="Experienced doctors and a caring nursing team. Profiles are sample content." />
      <Section>
        <Fetched state={state}>
          <div className="grid gap-3 md:grid-cols-2">{state.data?.map((d) => <DoctorCard key={d.id} d={d} />)}</div>
        </Fetched>
        <div className="card mt-6">
          <h2 className="font-bold">Nursing team</h2>
          <p className="mt-1 text-sm text-stone-600">Trained nurses assist with check-ups, injections, dressings and vaccination, and are your first point of contact during visits.</p>
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
      <PageHead title="Visit & contact" intro="We’re happy to hear from you." />
      <Section>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="card">
              <h2 className="font-bold">Contact</h2>
              <ul className="mt-3 space-y-3">
                {s.phone && <li><a className="btn w-full justify-start" href={telHref(s.phone)}>Call {s.phone}</a></li>}
                {wa && <li><a className="btn w-full justify-start" href={wa} target="_blank" rel="noreferrer">Chat on WhatsApp</a></li>}
                {s.email && <li><a className="btn w-full justify-start" href={`mailto:${s.email}`}>{s.email}</a></li>}
                <li><BookCta className="w-full" /></li>
              </ul>
            </div>
            <div className="card"><h2 className="font-bold">Address</h2><p className="mt-2 text-stone-600">{s.address}</p><a className="btn mt-3" href={map} target="_blank" rel="noreferrer">Get directions</a></div>
            <div className="card"><h2 className="mb-2 font-bold">Opening hours</h2><TimingsTable /></div>
          </div>
          <div>
            <iframe title="Map of Kundrathur, Chennai (approximate)" loading="lazy" className="h-80 w-full rounded-2xl border border-stone-200 md:h-full md:min-h-[28rem]"
              src="https://www.openstreetmap.org/export/embed.html?bbox=80.085%2C12.990%2C80.110%2C13.008&layer=mapnik&marker=12.9985%2C80.0985" />
            <p className="mt-2 text-xs text-stone-500">Map shows the Kundrathur area (approximate, sample location). Map by OpenStreetMap contributors.</p>
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
      <PageHead title="Privacy" intro="Plain-language summary of how appointment requests are handled on this demo site." />
      <Section>
        <div className="max-w-3xl space-y-5 text-stone-700">
          <div><h2 className="font-bold">What we collect</h2><p>When you request an appointment: your name, mobile number, whether the patient is a child or adult, age, preferred date and time, and an optional short note. We do <b>not</b> ask for medical history, diagnoses or reports. Please do not put medical details in the note.</p></div>
          <div><h2 className="font-bold">Why</h2><p>Only so clinic staff can call you to confirm a time. Your data is not sold, shared for marketing, or used for advertising.</p></div>
          <div><h2 className="font-bold">Who can see it</h2><p>Authorised clinic staff using the admin dashboard.</p></div>
          <div><h2 className="font-bold">How long we keep it</h2><p>Appointment requests are kept for about 90 days and then deleted. You can ask the clinic to delete your request sooner by calling us with your reference code.</p></div>
          <div><h2 className="font-bold">Cookies and third parties</h2><p>This site sets no tracking or advertising cookies. The map on the contact page is loaded from OpenStreetMap, which may receive your IP address when it loads.</p></div>
          <div className="rounded-2xl bg-sun-100 p-4 text-sm"><b>Demo notice:</b> this is a demonstration website with fictional content. Please do not submit real personal details unless you are the developer testing it. <Link className="underline" to="/book">Back to appointment form</Link></div>
        </div>
      </Section>
    </>
  );
}
