import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/db";

// tests must never message real people: force demo mode even if provider keys exist in .env
for (const k of ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_FROM", "RESEND_API_KEY", "EMAIL_FROM", "NOTIFY_PHONE", "NOTIFY_EMAIL"]) process.env[k] = "";

const app = createApp();
let token = "";
const created: string[] = [];

let openDate = "";
let phoneSeq = 0;
const valid = () => ({
  patientName: "Test Parent",
  phone: `9${String(Date.now()).slice(-6)}${String(++phoneSeq).padStart(3, "0")}`,
  patientType: "CHILD",
  age: 3,
  preferredDate: openDate,
  preferredSlot: "Morning",
  consent: true,
});

beforeAll(async () => {
  const r = await request(app).post("/api/v1/auth/login").send({ email: "admin@demo.clinic", password: "Demo@12345" });
  token = r.body.token;
  const av = await request(app).get(`/api/v1/availability?date=${new Date(Date.now() + 86400000).toISOString().slice(0, 10)}&days=14`);
  openDate = av.body.days.find((d: any) => d.slots[0].status === "available").date;
});

afterAll(async () => {
  await prisma.notification.deleteMany({ where: { appointment: { refCode: { in: created } } } });
  await prisma.appointment.deleteMany({ where: { refCode: { in: created } } });
  await prisma.$disconnect();
});

describe("public", () => {
  it("lists services", async () => {
    const r = await request(app).get("/api/v1/services");
    expect(r.status).toBe(200);
    expect(r.body.length).toBeGreaterThan(0);
  });

  it("accepts a valid appointment request", async () => {
    const r = await request(app).post("/api/v1/appointments").send(valid());
    expect(r.status).toBe(201);
    expect(r.body.refCode).toMatch(/^LCC-/);
    created.push(r.body.refCode);
  });

  it("rejects bad phone, past date and missing consent", async () => {
    const bad = { ...valid(), phone: "123", preferredDate: "2020-01-01", consent: false };
    const r = await request(app).post("/api/v1/appointments").send(bad);
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("VALIDATION_ERROR");
    expect(r.body.error.details.length).toBeGreaterThanOrEqual(2);
  });

  it("silently drops honeypot submissions", async () => {
    const before = await prisma.appointment.count();
    const r = await request(app).post("/api/v1/appointments").send({ ...valid(), website: "spam.com" });
    expect(r.status).toBe(201);
    expect(await prisma.appointment.count()).toBe(before);
  });
});

describe("availability and status lookup", () => {
  it("reports slots per day and closes Sundays", async () => {
    const r = await request(app).get(`/api/v1/availability?date=${openDate}&days=14`);
    expect(r.body.days).toHaveLength(14);
    const sunday = r.body.days.find((d: any) => d.weekday === 0);
    expect(sunday.closed).toBe(true);
  });

  it("rejects a request for a closed day", async () => {
    const av = await request(app).get(`/api/v1/availability?date=${openDate}&days=14`);
    const sunday = av.body.days.find((d: any) => d.weekday === 0).date;
    const r = await request(app).post("/api/v1/appointments").send({ ...valid(), preferredDate: sunday });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("SLOT_UNAVAILABLE");
  });

  it("looks up a request only with the right phone", async () => {
    const ok = await request(app).post("/api/v1/appointments/lookup").send({ refCode: "lcc-1001", phone: "9000000001" });
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBeDefined();
    const bad = await request(app).post("/api/v1/appointments/lookup").send({ refCode: "LCC-1001", phone: "9999999999" });
    expect(bad.status).toBe(404);
  });
});

describe("auth and admin", () => {
  it("rejects wrong password", async () => {
    const r = await request(app).post("/api/v1/auth/login").send({ email: "admin@demo.clinic", password: "nope" });
    expect(r.status).toBe(401);
  });

  it("blocks admin routes without a token", async () => {
    expect((await request(app).get("/api/v1/admin/appointments")).status).toBe(401);
  });

  it("lists, filters and updates appointments", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const list = await request(app).get("/api/v1/admin/appointments?status=NEW&limit=5").set(auth);
    expect(list.status).toBe(200);
    expect(list.body.meta.limit).toBe(5);
    const id = list.body.data[0].id;
    const upd = await request(app).patch(`/api/v1/admin/appointments/${id}`).set(auth).send({ staffNote: "called" });
    expect(upd.body.staffNote).toBe("called");
    await request(app).patch(`/api/v1/admin/appointments/${id}`).set(auth).send({ staffNote: null });
  });

  it("returns stats and 404 for unknown id", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    expect((await request(app).get("/api/v1/admin/stats").set(auth)).body.byStatus).toBeDefined();
    expect((await request(app).get("/api/v1/admin/appointments/999999").set(auth)).status).toBe(404);
  });

  it("records notifications: staff alert on new request, patient message on confirm, day-before reminder", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const r = await request(app).post("/api/v1/appointments").send(valid());
    expect(r.status).toBe(201);
    created.push(r.body.refCode);
    const appt = await prisma.appointment.findUniqueOrThrow({ where: { refCode: r.body.refCode } });
    await new Promise((x) => setTimeout(x, 300));
    const staff = await prisma.notification.findMany({ where: { appointmentId: appt.id, kind: "NEW_REQUEST" } });
    expect(staff.map((n) => n.channel).sort()).toEqual(["EMAIL", "WHATSAPP"]);
    expect(staff.every((n) => n.status === "DRY_RUN")).toBe(true);

    await request(app).patch(`/api/v1/admin/appointments/${appt.id}`).set(auth).send({ status: "CONFIRMED" });
    await new Promise((x) => setTimeout(x, 300));
    expect((await prisma.notification.count({ where: { appointmentId: appt.id, kind: "CONFIRMED" } })) > 0).toBe(true);

    // make it due tomorrow (IST) and run the reminder job twice: it must send once
    const ist = new Date(Date.now() + 5.5 * 3600_000);
    const tomorrow = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + 1));
    await prisma.appointment.update({ where: { id: appt.id }, data: { preferredDate: tomorrow } });
    const first = await request(app).post("/api/v1/admin/reminders/run").set(auth);
    const second = await request(app).post("/api/v1/admin/reminders/run").set(auth);
    expect(first.body.sent).toBeGreaterThanOrEqual(1);
    expect(second.body.sent).toBe(0);
    expect((await prisma.notification.count({ where: { appointmentId: appt.id, kind: "REMINDER" } })) > 0).toBe(true);

    const list = await request(app).get("/api/v1/admin/notifications").set(auth);
    expect(list.body.providers).toEqual({ WHATSAPP: false, EMAIL: false });
    expect(list.body.data.length).toBeGreaterThan(0);
  });

  it("protects the cron reminder endpoint", async () => {
    expect((await request(app).get("/api/v1/cron/reminders")).status).toBe(401);
  });
});
