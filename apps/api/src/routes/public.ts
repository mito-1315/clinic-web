import { Router } from "express";
import rateLimit from "express-rate-limit";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "../db";
import { HttpError, parse } from "../http";
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
  consent: z.literal(true, { errorMap: () => ({ message: "Consent is required" }) }),
  website: z.string().optional(), // honeypot: real users leave this empty
});

const newRefCode = () => "LCC-" + randomBytes(4).toString("hex").slice(0, 6).toUpperCase();

publicRouter.post("/appointments", apptLimiter, async (req, res) => {
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
      consentAt: new Date(),
    },
  });
  res.status(201).json({ refCode: a.refCode, status: a.status });
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
