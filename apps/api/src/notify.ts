import { prisma } from "./db";

export type Channel = "WHATSAPP" | "EMAIL";
type Opts = { kind: string; subject?: string; appointmentId?: number };

const env = (k: string) => process.env[k]?.trim() || "";

/** Which providers have credentials. Without them messages are recorded as DRY_RUN (visible in the admin Notifications page). */
export const providers = () => ({
  WHATSAPP: !!(env("TWILIO_ACCOUNT_SID") && env("TWILIO_AUTH_TOKEN") && env("TWILIO_WHATSAPP_FROM")),
  EMAIL: !!(env("RESEND_API_KEY") && env("EMAIL_FROM")),
});

/** 10-digit Indian mobiles become +91 numbers; anything else with digits is kept as +digits. */
export const e164 = (p: string) => {
  const d = p.replace(/\D/g, "");
  return d.length === 10 ? `+91${d}` : `+${d}`;
};

/** `content` is either a plain Body or a Twilio Content Template (ContentSid + variables). */
async function twilio(to: string, from: string, content: Record<string, string>) {
  const sid = env("TWILIO_ACCOUNT_SID");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`${sid}:${env("TWILIO_AUTH_TOKEN")}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: to, From: from, ...content }),
  });
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${(await res.text()).slice(0, 160)}`);
}

// WhatsApp business messages use one approved template whose single variable {{1}} carries the text.
const whatsappContent = (body: string): Record<string, string> => {
  const t = env("TWILIO_WHATSAPP_CONTENT_SID");
  return t ? { ContentSid: t, ContentVariables: JSON.stringify({ "1": body.replace(/\s+/g, " ").slice(0, 500) }) } : { Body: body };
};

async function resend(to: string, subject: string, body: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env("EMAIL_FROM"), to, subject, text: body }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 160)}`);
}

/** Sends one message on one channel and records it. Never throws, so a provider outage cannot break a booking. */
export async function send(channel: Channel, to: string, body: string, o: Opts): Promise<boolean> {
  let status: "SENT" | "FAILED" | "DRY_RUN" = "DRY_RUN";
  let error: string | null = null;
  try {
    if (!providers()[channel]) {
      if (process.env.NODE_ENV !== "test") console.log(`[notify dry-run] ${channel} ${o.kind} (not sent: no provider keys)`); // no names or numbers in logs
    } else if (channel === "EMAIL") { await resend(to, o.subject ?? "Notification", body); status = "SENT"; }
    else { await twilio(`whatsapp:${e164(to)}`, env("TWILIO_WHATSAPP_FROM"), whatsappContent(body)); status = "SENT"; }
  } catch (e) {
    status = "FAILED";
    error = e instanceof Error ? e.message : "unknown error";
    console.error(`[notify] ${channel} ${o.kind} failed: ${error.replace(/\+?\d[\d\s-]{8,}\d/g, "[number]")}`);
  }
  try {
    await prisma.notification.create({ data: { channel, to, body, kind: o.kind, status, error, appointmentId: o.appointmentId ?? null } });
  } catch { /* logging must not break the caller */ }
  return status !== "FAILED";
}

async function settings() {
  const rows = await prisma.clinicSetting.findMany();
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string>;
}
const on = (v: string | undefined) => v !== "off";

/** Staff alert on every enabled channel (WhatsApp and email together). */
export async function notifyStaff(subject: string, body: string, o: Opts) {
  const s = await settings();
  const phone = s.notifyPhone || env("NOTIFY_PHONE"), email = s.notifyEmail || env("NOTIFY_EMAIL");
  const jobs: Promise<boolean>[] = [];
  if (phone && on(s.notifyWhatsApp)) jobs.push(send("WHATSAPP", phone, body, o));
  if (email && on(s.notifyEmailOn)) jobs.push(send("EMAIL", email, body, { ...o, subject }));
  await Promise.all(jobs);
  return jobs.length;
}

/** Patient message, by WhatsApp. */
export async function notifyPatient(phone: string, body: string, o: Opts) {
  await send("WHATSAPP", phone, body, o);
}

const fmtDate = (d: Date) => d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
type Appt = { id: number; refCode: string; patientName: string; phone: string; patientType: string; age: number; preferredDate: Date; preferredSlot: string };
const clinicName = async () => (await settings()).name || "Lakshmi Child Care Center";
const clinicPhone = async () => (await settings()).phone || "";

export async function notifyNewRequest(a: Appt, service?: string | null) {
  const body = `New request ${a.refCode}: ${a.patientName} (${a.patientType === "CHILD" ? "child" : "adult"}, ${a.age}y), ${fmtDate(a.preferredDate)} ${a.preferredSlot}${service ? `, ${service}` : ""}. Call ${a.phone}.`;
  return notifyStaff(`New appointment request ${a.refCode}`, body, { kind: "NEW_REQUEST", appointmentId: a.id });
}

export async function notifyStatus(a: Appt, status: "CONFIRMED" | "CANCELLED") {
  const [name, phone] = [await clinicName(), await clinicPhone()];
  const body = status === "CONFIRMED"
    ? `Hello ${a.patientName}, your visit to ${name} is confirmed for ${fmtDate(a.preferredDate)} (${a.preferredSlot}). Ref ${a.refCode}.${phone ? ` To change it call ${phone}.` : ""}`
    : `Hello ${a.patientName}, we could not keep your request ${a.refCode} for ${fmtDate(a.preferredDate)}.${phone ? ` Please call ${phone} to pick another time.` : ""}`;
  await notifyPatient(a.phone, body, { kind: status === "CONFIRMED" ? "CONFIRMED" : "CANCELLED", appointmentId: a.id });
}

export async function sendReminder(a: Appt) {
  const [name, phone] = [await clinicName(), await clinicPhone()];
  const body = `Reminder: ${a.patientName}, your visit to ${name} is on ${fmtDate(a.preferredDate)} (${a.preferredSlot}). Ref ${a.refCode}.${phone ? ` Questions? ${phone}.` : ""}`;
  await notifyPatient(a.phone, body, { kind: "REMINDER", appointmentId: a.id });
  await prisma.appointment.update({ where: { id: a.id }, data: { reminderSentAt: new Date() } });
}

/** Day-before reminders for confirmed visits whose patient asked for one. Safe to call repeatedly. */
export async function runReminders(): Promise<number> {
  if (!on((await settings()).remindersOn)) return 0;
  const ist = new Date(Date.now() + 5.5 * 3600_000);
  const tomorrow = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + 1));
  const due = await prisma.appointment.findMany({ where: { status: "CONFIRMED", wantsReminder: true, reminderSentAt: null, preferredDate: tomorrow } });
  for (const a of due) await sendReminder(a);
  return due.length;
}

/** Keeps the promise on the privacy page: requests and message logs are deleted about 90 days after they are created. */
export async function purgeOldData(): Promise<{ appointments: number; notifications: number }> {
  const cutoff = new Date(Date.now() - 90 * 86400_000);
  const notifications = (await prisma.notification.deleteMany({ where: { createdAt: { lt: cutoff } } })).count;
  const appointments = (await prisma.appointment.deleteMany({ where: { createdAt: { lt: cutoff } } })).count;
  return { appointments, notifications };
}

/** In-process scheduler: checks every 30 minutes, only during the day in IST. Use /cron/reminders if the host sleeps. */
export function startReminderScheduler() {
  if (process.env.NODE_ENV === "test") return;
  const tick = () => {
    const h = new Date(Date.now() + 5.5 * 3600_000).getUTCHours();
    if (h >= 9 && h < 20) runReminders().catch((e) => console.error("[reminders]", e instanceof Error ? e.message : e));
    purgeOldData().catch((e) => console.error("[purge]", e instanceof Error ? e.message : e));
  };
  setInterval(tick, 30 * 60_000).unref();
  setTimeout(tick, 15_000).unref();
}
