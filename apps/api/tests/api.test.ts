import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/db";

const app = createApp();
let token = "";
const created: string[] = [];

const valid = () => ({
  patientName: "Test Parent",
  phone: "98765 43210",
  patientType: "CHILD",
  age: 3,
  preferredDate: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
  preferredSlot: "Morning",
  consent: true,
});

beforeAll(async () => {
  const r = await request(app).post("/api/v1/auth/login").send({ email: "admin@demo.clinic", password: "Demo@12345" });
  token = r.body.token;
});

afterAll(async () => {
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
});
