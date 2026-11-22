import { Router } from "express";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db";
import { HttpError, intParam, parse } from "../http";

export const adminRouter = Router();

// ---------- Appointments ----------
const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["NEW", "CONFIRMED", "CANCELLED", "COMPLETED"]).optional(),
  patientType: z.enum(["CHILD", "ADULT"]).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  q: z.string().trim().max(80).optional(),
});

adminRouter.get("/appointments", async (req, res) => {
  const { page, limit, status, patientType, date, q } = parse(listQuery, req.query);
  const where: Prisma.AppointmentWhereInput = {
    ...(status && { status }),
    ...(patientType && { patientType }),
    ...(date && { preferredDate: new Date(date) }),
    ...(q && {
      OR: [
        { patientName: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { refCode: { contains: q, mode: "insensitive" } },
      ],
    }),
  };
  const [total, data] = await Promise.all([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      include: { service: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  res.json({ data, meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
});

adminRouter.get("/appointments/:id", async (req, res) => {
  const a = await prisma.appointment.findUnique({ where: { id: intParam(req.params.id) }, include: { service: true } });
  if (!a) throw new HttpError(404, "NOT_FOUND", "Appointment not found");
  res.json(a);
});

adminRouter.patch("/appointments/:id", async (req, res) => {
  const body = parse(
    z.object({ status: z.enum(["NEW", "CONFIRMED", "CANCELLED", "COMPLETED"]).optional(), staffNote: z.string().max(500).nullable().optional() }),
    req.body,
  );
  res.json(await prisma.appointment.update({ where: { id: intParam(req.params.id) }, data: body }));
});

adminRouter.get("/stats", async (_req, res) => {
  const startOfDay = new Date(new Date().toISOString().slice(0, 10));
  const [groups, today] = await Promise.all([
    prisma.appointment.groupBy({ by: ["status"], _count: true }),
    prisma.appointment.count({ where: { createdAt: { gte: startOfDay } } }),
  ]);
  const byStatus = { NEW: 0, CONFIRMED: 0, CANCELLED: 0, COMPLETED: 0 } as Record<string, number>;
  for (const g of groups) byStatus[g.status] = g._count;
  const since = new Date(startOfDay.getTime() - 6 * 86400000);
  const recent = await prisma.appointment.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } });
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(since.getTime() + i * 86400000).toISOString().slice(0, 10);
    return { date: day, count: recent.filter((r) => r.createdAt.toISOString().slice(0, 10) === day).length };
  });
  res.json({ total: Object.values(byStatus).reduce((a, b) => a + b, 0), today, byStatus, last7 });
});

// ---------- Generic CRUD for simple content ----------
// shortcut: model is typed loosely to keep one helper for three tables.
function crud(path: string, model: any, schema: z.ZodObject<any>, orderBy: object) {
  adminRouter.get(path, async (_q, res) => res.json(await model.findMany({ orderBy })));
  adminRouter.post(path, async (req, res) => res.status(201).json(await model.create({ data: parse(schema, req.body) })));
  adminRouter.put(`${path}/:id`, async (req, res) => {
    res.json(await model.update({ where: { id: intParam(req.params.id) }, data: parse(schema.partial(), req.body) }));
  });
  adminRouter.delete(`${path}/:id`, async (req, res) => {
    await model.delete({ where: { id: intParam(req.params.id) } });
    res.status(204).end();
  });
}

crud(
  "/services",
  prisma.service,
  z.object({
    title: z.string().trim().min(2).max(100),
    description: z.string().trim().min(1).max(500),
    category: z.string().trim().min(1).max(50),
    sortOrder: z.number().int().default(0),
    isActive: z.boolean().default(true),
  }),
  { sortOrder: "asc" },
);

crud(
  "/doctors",
  prisma.doctor,
  z.object({
    name: z.string().trim().min(2).max(100),
    role: z.string().trim().min(1).max(100),
    qualification: z.string().trim().min(1).max(150),
    experienceYears: z.number().int().min(0).max(80),
    bio: z.string().trim().min(1).max(800),
    photoUrl: z.string().url().nullable().optional(),
    visitingDays: z.string().max(60).nullable().optional(),
    sortOrder: z.number().int().default(0),
    isActive: z.boolean().default(true),
  }),
  { sortOrder: "asc" },
);

crud(
  "/announcements",
  prisma.announcement,
  z.object({
    title: z.string().trim().min(1).max(100),
    body: z.string().trim().min(1).max(500),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().nullable().optional(),
    isActive: z.boolean().default(true),
  }),
  { startsAt: "desc" },
);

// ---------- Timings ----------
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");
const timingRow = z.object({
  weekday: z.number().int().min(0).max(6),
  openTime: hhmm.nullable().optional(),
  closeTime: hhmm.nullable().optional(),
  open2Time: hhmm.nullable().optional(),
  close2Time: hhmm.nullable().optional(),
  isClosed: z.boolean().default(false),
  note: z.string().max(120).nullable().optional(),
});

adminRouter.put("/timings", async (req, res) => {
  const rows = parse(z.array(timingRow).min(1).max(7), req.body);
  await prisma.$transaction(
    rows.map((r) => prisma.timing.upsert({ where: { weekday: r.weekday }, update: r, create: r })),
  );
  res.json(await prisma.timing.findMany({ orderBy: { weekday: "asc" } }));
});

adminRouter.post("/timing-overrides", async (req, res) => {
  const d = parse(
    z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), isClosed: z.boolean().default(true), openTime: hhmm.nullable().optional(), closeTime: hhmm.nullable().optional(), reason: z.string().trim().min(1).max(120) }),
    req.body,
  );
  const date = new Date(d.date);
  res.status(201).json(await prisma.timingOverride.upsert({ where: { date }, update: { ...d, date }, create: { ...d, date } }));
});

adminRouter.delete("/timing-overrides/:id", async (req, res) => {
  await prisma.timingOverride.delete({ where: { id: intParam(req.params.id) } });
  res.status(204).end();
});

// ---------- Settings ----------
const settingsSchema = z
  .object({
    name: z.string().max(100),
    phone: z.string().max(30),
    whatsapp: z.string().regex(/^\d{10,15}$/, "Digits only, with country code"),
    email: z.string().email(),
    address: z.string().max(250),
    mapUrl: z.string().url(),
  })
  .partial()
  .strict();

adminRouter.get("/settings", async (_q, res) => {
  const rows = await prisma.clinicSetting.findMany();
  res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
});

adminRouter.put("/settings", async (req, res) => {
  const d = parse(settingsSchema, req.body);
  await prisma.$transaction(
    Object.entries(d).map(([key, value]) => prisma.clinicSetting.upsert({ where: { key }, update: { value: value! }, create: { key, value: value! } })),
  );
  const rows = await prisma.clinicSetting.findMany();
  res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
});
