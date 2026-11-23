import { Router } from "express";
import rateLimit from "express-rate-limit";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { prisma } from "../db";
import { HttpError, parse } from "../http";
import { notifyNewRequest, purgeOldData, runReminders } from "../notify";
import { getAvailability } from "../availability";

export const publicRouter = Router();

const todayUtc = () => new Date(new Date().toISOString().slice(0, 10));

publicRouter.get("/services", async (_q, res) => {
  res.set("Cache-Control", "public, max-age=60");
  res.json(await prisma.service.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }));
});

publicRouter.get("/doctors", async (_q, res) => {
  res.set("Cache-Control", "public, max-age=60");
  res.json(await prisma.doctor.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }));
});

publicRouter.get("/timings", async (_q, res) => {
  const [weekly, overrides] = await Promise.all([
    prisma.timing.findMany({ orderBy: { weekday: "asc" } }),
    prisma.timingOverride.findMany({ where: { date: { gte: todayUtc() } }, orderBy: { date: "asc" } }),
  ]);
  res.json({ weekly, overrides });
});

publicRouter.get("/announcements/active", async (_q, res) => {
  const now = new Date();
  res.json(
    await prisma.announcement.findMany({
      where: { isActive: true, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      orderBy: { startsAt: "desc" },
    }),
  );
});

publicRouter.get("/settings/public", async (_q, res) => {
  const rows = await prisma.clinicSetting.findMany();
  res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
});

publicRouter.get("/availability", async (req, res) => {
  const q = parse(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), days: z.coerce.number().int().min(1).max(14).default(1) }), req.query);
  if (Number.isNaN(new Date(q.date).getTime())) throw new HttpError(400, "VALIDATION_ERROR", "Invalid date");
  res.set("Cache-Control", "no-store");
  res.json({ days: await getAvailability(q.date, q.days) });
});

const apptLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: process.env.NODE_ENV === "test" ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: () => {
    throw new HttpError(429, "RATE_LIMITED", "Too many requests, please call the clinic instead");
  },
});

const dayLimiter = rateLimit({
  windowMs: 24 * 60 * 60_000,
  limit: process.env.NODE_ENV === "test" ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: () => {
    throw new HttpError(429, "RATE_LIMITED", "Too many requests today, please call the clinic instead");
  },
});
const MAX_OPEN_PER_PHONE = 3;

export const appointmentInput = z.object({
  patientName: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .transform((s) => s.replace(/[\s-]/g, ""))
    .pipe(z.string().regex(/^(\+91)?[6-9]\d{9}$/, "Enter a valid Indian mobile number")),
  patientType: z.enum(["CHILD", "ADULT"]),
  age: z.number().int().min(0).max(120),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  preferredSlot: z.enum(["Morning", "Evening"]),
  serviceId: z.number().int().positive().optional(),
  note: z.string().trim().max(300).optional(),
  wantsReminder: z.boolean().default(true),
  consent: z.literal(true, { errorMap: () => ({ message: "Consent is required" }) }),
  website: z.string().optional(), // honeypot: real users leave this empty
});

const newRefCode = () => "LCC-" + randomBytes(4).toString("hex").slice(0, 6).toUpperCase();

publicRouter.post("/appointments", apptLimiter, dayLimiter, async (req, res) => {
  const d = parse(appointmentInput, req.body);
  if (d.website) {
    // bot: pretend success, store nothing
    res.status(201).json({ refCode: newRefCode(), status: "NEW" });
    return;
  }
  const date = new Date(d.preferredDate);
  if (Number.isNaN(date.getTime()) || date < todayUtc()) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid input", [{ path: "preferredDate", message: "Date cannot be in the past" }]);
  }
  if (d.serviceId && !(await prisma.service.findFirst({ where: { id: d.serviceId, isActive: true } }))) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid input", [{ path: "serviceId", message: "Unknown service" }]);
  }
  // Stops one number from blocking slots: one open request per day, and a few open requests in total.
  const digits = d.phone.replace(/^\+91/, "");
  const open = await prisma.appointment.findMany({
    where: { phone: { in: [digits, `+91${digits}`] }, status: { in: ["NEW", "CONFIRMED"] }, preferredDate: { gte: todayUtc() } },
    select: { preferredDate: true },
  });
  if (open.some((o) => o.preferredDate.getTime() === date.getTime())) {
    throw new HttpError(409, "DUPLICATE_REQUEST", "You already have a request for that day. Please call the clinic to change it.");
  }
  if (open.length >= MAX_OPEN_PER_PHONE) {
    throw new HttpError(429, "TOO_MANY_OPEN", `This number already has ${MAX_OPEN_PER_PHONE} open requests. Please call the clinic.`);
  }
  const [day] = await getAvailability(d.preferredDate, 1);
  const slot = day.slots.find((x) => x.slot === d.preferredSlot)!;
  if (!slot.open) {
    throw new HttpError(409, "SLOT_UNAVAILABLE", slot.status === "full" ? "That time is fully booked. Please choose another." : "The clinic is closed at that time. Please choose another.");
  }
  const a = await prisma.appointment.create({
    data: {
      refCode: newRefCode(),
      patientName: d.patientName,
      phone: d.phone,
      patientType: d.patientType,
      age: d.age,
      preferredDate: date,
      preferredSlot: d.preferredSlot,
      serviceId: d.serviceId,
      note: d.note || null,
      wantsReminder: d.wantsReminder,
      consentAt: new Date(),
    },
  });
  const svc = d.serviceId ? await prisma.service.findUnique({ where: { id: d.serviceId }, select: { title: true } }) : null;
  void notifyNewRequest(a, svc?.title).catch(() => {});
  res.status(201).json({ refCode: a.refCode, status: a.status });
});

/** For an external pinger (e.g. cron-job.org) when the host sleeps: GET /cron/reminders with header x-cron-key = CRON_SECRET. */
publicRouter.get("/cron/reminders", async (req, res) => {
  const key = process.env.CRON_SECRET;
  const given = Buffer.from(req.header("x-cron-key") ?? "");
  if (!key || given.length !== Buffer.byteLength(key) || !timingSafeEqual(given, Buffer.from(key))) throw new HttpError(401, "UNAUTHORIZED", "Invalid key");
  const sent = await runReminders();
  await purgeOldData();
  res.json({ sent });
});

const lookupLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: process.env.NODE_ENV === "test" ? 1000 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: () => {
    throw new HttpError(429, "RATE_LIMITED", "Too many lookups, please try again later");
  },
});

/** Public status check: the reference code plus the phone number it was booked with. */
publicRouter.post("/appointments/lookup", lookupLimiter, async (req, res) => {
  const { refCode, phone } = parse(
    z.object({ refCode: z.string().trim().toUpperCase().max(20), phone: z.string().transform((p) => p.replace(/[\s-]/g, "")) }),
    req.body,
  );
  const a = await prisma.appointment.findUnique({ where: { refCode }, include: { service: { select: { title: true } } } });
  const norm = (p: string) => p.replace(/^\+91/, "");
  if (!a || norm(a.phone) !== norm(phone)) throw new HttpError(404, "NOT_FOUND", "No request found with that reference code and phone number");
  res.set("Cache-Control", "no-store");
  res.json({
    refCode: a.refCode, status: a.status, patientType: a.patientType, firstName: a.patientName.split(" ")[0],
    preferredDate: a.preferredDate, preferredSlot: a.preferredSlot, service: a.service?.title ?? null,
    createdAt: a.createdAt, updatedAt: a.updatedAt,
  });
});
