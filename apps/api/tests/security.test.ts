import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// Local, dummy-data checks only. Provider keys are blanked so nothing can reach a real person.
for (const k of ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_FROM", "RESEND_API_KEY", "EMAIL_FROM", "NOTIFY_PHONE", "NOTIFY_EMAIL"]) process.env[k] = "";

const { createApp } = await import("../src/app");
const { prisma } = await import("../src/db");
const { assertStrongSecret } = await import("../src/auth");
const { purgeOldData } = await import("../src/notify");

const app = createApp();
const api = (p: string) => `/api/v1${p}`;
const TEMP = "sec-audit-temp@example.test";
let demoToken = "";
let tempId = 0;

beforeAll(async () => {
  demoToken = (await request(app).post(api("/auth/login")).send({ email: "admin@demo.clinic", password: "Demo@12345" })).body.token;
  await prisma.adminUser.deleteMany({ where: { email: TEMP } });
  const u = await prisma.adminUser.create({ data: { email: TEMP, name: "Temp", passwordHash: await bcrypt.hash("OldPassw0rd!", 10), role: "ADMIN", isDemo: false } });
  tempId = u.id;
});
afterAll(async () => {
  await prisma.adminUser.deleteMany({ where: { email: TEMP } });
  await prisma.appointment.deleteMany({ where: { patientName: "SecAudit Old" } });
});

describe("authentication", () => {
  it("rejects missing, malformed, tampered, none-alg and wrong-secret tokens on every admin route", async () => {
    const good = demoToken;
    const [h, p, s] = good.split(".");
    const none = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url") + "." + p + ".";
    const forged = jwt.sign({ id: 1, role: "ADMIN" }, "guess-the-secret");
    const tampered = `${h}.${Buffer.from(JSON.stringify({ id: 1, role: "ADMIN", iat: 1, exp: 9999999999 })).toString("base64url")}.${s}`;
    const expired = jwt.sign({ id: 1, role: "ADMIN" }, process.env.JWT_SECRET ?? "dev-only-secret", { expiresIn: -10 });
    for (const path of ["/admin/appointments", "/admin/stats", "/admin/settings", "/admin/notifications", "/admin/services", "/auth/me"]) {
      for (const t of [undefined, "Bearer", "Bearer x", `Bearer ${none}`, `Bearer ${forged}`, `Bearer ${tampered}`, `Bearer ${expired}`]) {
        const r = await request(app).get(api(path)).set(t ? { Authorization: t } : {});
        expect(r.status, `${path} with ${String(t).slice(0, 20)}`).toBe(401);
      }
    }
  });

  it("login does not reveal whether an email exists", async () => {
    const a = await request(app).post(api("/auth/login")).send({ email: "nobody@example.test", password: "x" });
    const b = await request(app).post(api("/auth/login")).send({ email: "admin@demo.clinic", password: "wrong" });
    expect([a.status, a.body.error.message]).toEqual([b.status, b.body.error.message]);
  });

  it("a token stops working after the password changes or the user is deleted", async () => {
    const login = await request(app).post(api("/auth/login")).send({ email: TEMP, password: "OldPassw0rd!" });
    const old = login.body.token;
    expect((await request(app).get(api("/admin/stats")).set("Authorization", `Bearer ${old}`)).status).toBe(200);
    await new Promise((r) => setTimeout(r, 1100)); // jwt iat has one-second resolution
    expect((await request(app).patch(api("/auth/password")).set("Authorization", `Bearer ${old}`).send({ currentPassword: "OldPassw0rd!", newPassword: "NewPassw0rd!" })).status).toBe(204);
    expect((await request(app).get(api("/admin/stats")).set("Authorization", `Bearer ${old}`)).status).toBe(401);
    const fresh = (await request(app).post(api("/auth/login")).send({ email: TEMP, password: "NewPassw0rd!" })).body.token;
    expect((await request(app).get(api("/admin/stats")).set("Authorization", `Bearer ${fresh}`)).status).toBe(200);
    await prisma.adminUser.delete({ where: { id: tempId } });
    expect((await request(app).get(api("/admin/stats")).set("Authorization", `Bearer ${fresh}`)).status).toBe(401);
  });

  it("refuses weak JWT secrets in production", () => {
    expect(() => assertStrongSecret("change-me", "production")).toThrow();
    expect(() => assertStrongSecret("short", "production")).toThrow();
    expect(() => assertStrongSecret("x".repeat(40), "production")).not.toThrow();
    expect(() => assertStrongSecret("change-me", "development")).not.toThrow();
  });
});

describe("input handling", () => {
  it("does not accept big bodies on public routes, or parse them before authenticating admin routes", async () => {
    const big = { patientName: "x".repeat(100_000) };
    expect((await request(app).post(api("/appointments")).send(big)).status).toBe(413);
    expect((await request(app).put(api("/admin/settings")).send({ name: "x".repeat(100_000) })).status).toBe(401);
  });

  it("ignores extra fields (no mass assignment) and keeps SQL-looking text inert", async () => {
    const av = await request(app).get(api("/availability?date=" + new Date(Date.now() + 86400000).toISOString().slice(0, 10) + "&days=14"));
    const day = av.body.days.find((d: any) => d.slots[0].status === "available");
    const r = await request(app).post(api("/appointments")).send({
      patientName: "Robert'); DROP TABLE \"Appointment\";--", phone: "9876543210", patientType: "ADULT", age: 30, preferredDate: day.date, preferredSlot: "Morning",
      consent: true, status: "COMPLETED", staffNote: "x", id: 1,
    });
    expect(r.status).toBe(201);
    const row = await prisma.appointment.findUniqueOrThrow({ where: { refCode: r.body.refCode } });
    expect(row.status).toBe("NEW");
    expect(row.staffNote).toBeNull();
    await prisma.notification.deleteMany({ where: { appointmentId: row.id } });
    await prisma.appointment.delete({ where: { id: row.id } });
    const list = await request(app).get(api("/admin/appointments?q=' OR 1=1 --&limit=5")).set("Authorization", `Bearer ${demoToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.length).toBe(0);
  });

  it("only allows safe image values for photos", async () => {
    const auth = { Authorization: `Bearer ${demoToken}` };
    const doc = (await request(app).get(api("/admin/doctors")).set(auth)).body[0];
    const original = doc.photoUrl;
    const body = { name: doc.name, role: doc.role, qualification: doc.qualification, experienceYears: doc.experienceYears, bio: doc.bio, sortOrder: 1, isActive: true };
    try {
      for (const bad of ["javascript:alert(1)", "data:text/html;base64,PHNjcmlwdD4=", "data:image/svg+xml;base64,PHN2Zz4="]) {
        expect((await request(app).put(api(`/admin/doctors/${doc.id}`)).set(auth).send({ ...body, photoUrl: bad })).status, bad).toBe(400);
      }
      expect((await request(app).put(api(`/admin/doctors/${doc.id}`)).set(auth).send({ ...body, photoUrl: "/photos/smile-960.jpg" })).status).toBe(200);
    } finally {
      await prisma.doctor.update({ where: { id: doc.id }, data: { photoUrl: original } }); // never leave test data behind
    }
  });

  it("returns generic errors and security headers", async () => {
    const r = await request(app).get(api("/appointments/lookup")); // wrong method
    expect(JSON.stringify(r.body)).not.toMatch(/at .*\.ts|node_modules|prisma/i);
    const h = await request(app).get(api("/health"));
    expect(h.headers["x-content-type-options"]).toBe("nosniff");
    expect(h.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("messaging abuse and data lifecycle", () => {
  it("in production the public demo login cannot change alert targets or trigger sends", async () => {
    const auth = { Authorization: `Bearer ${demoToken}` };
    const before = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      expect((await request(app).put(api("/admin/settings")).set(auth).send({ notifyPhone: "+919999999999" })).status).toBe(403);
      expect((await request(app).post(api("/admin/notifications/test")).set(auth)).status).toBe(403);
      expect((await request(app).post(api("/admin/reminders/run")).set(auth)).status).toBe(403);
    } finally { process.env.NODE_ENV = before; }
    expect((await request(app).post(api("/admin/notifications/test")).set(auth)).status).toBe(200); // fine locally
  });

  it("deletes requests and message logs older than the 90 days the privacy page promises", async () => {
    const old = new Date(Date.now() - 100 * 86400000);
    const a = await prisma.appointment.create({
      data: { refCode: "LCC-OLDTST", patientName: "SecAudit Old", phone: "9876543210", patientType: "ADULT", age: 30, preferredDate: old, preferredSlot: "Morning", consentAt: old, createdAt: old },
    });
    await prisma.notification.create({ data: { channel: "EMAIL", to: "x", kind: "TEST", body: "x", status: "DRY_RUN", appointmentId: a.id, createdAt: old } });
    await purgeOldData();
    expect(await prisma.appointment.findUnique({ where: { id: a.id } })).toBeNull();
    expect(await prisma.notification.count({ where: { createdAt: { lt: new Date(Date.now() - 90 * 86400000) } } })).toBe(0);
  });

  it("protects the cron endpoint", async () => {
    process.env.CRON_SECRET = "test-cron-secret-123";
    expect((await request(app).get(api("/cron/reminders"))).status).toBe(401);
    expect((await request(app).get(api("/cron/reminders")).set("x-cron-key", "wrong")).status).toBe(401);
    expect((await request(app).get(api("/cron/reminders")).set("x-cron-key", "test-cron-secret-123")).status).toBe(200);
    delete process.env.CRON_SECRET;
  });
});

describe("abuse limits and roles", () => {
  const freshPhone = () => `9${String(Date.now()).slice(-6)}${Math.floor(Math.random() * 900 + 100)}`;
  const refs: string[] = [];
  afterAll(async () => {
    const rows = await prisma.appointment.findMany({ where: { refCode: { in: refs } }, select: { id: true } });
    await prisma.notification.deleteMany({ where: { appointmentId: { in: rows.map((r) => r.id) } } });
    await prisma.appointment.deleteMany({ where: { refCode: { in: refs } } });
  });

  it("one number cannot hold several requests for the same day, or more than three open requests", async () => {
    const av = await request(app).get(api("/availability?date=" + new Date(Date.now() + 86400000).toISOString().slice(0, 10) + "&days=14"));
    const days = av.body.days.filter((d: any) => d.slots[0].status === "available").map((d: any) => d.date);
    expect(days.length).toBeGreaterThanOrEqual(4);
    const phone = freshPhone();
    const book = (date: string) => request(app).post(api("/appointments")).send({ patientName: "Flood Test", phone, patientType: "ADULT", age: 30, preferredDate: date, preferredSlot: "Morning", consent: true });
    const a = await book(days[0]);
    expect(a.status).toBe(201); refs.push(a.body.refCode);
    expect((await book(days[0])).status).toBe(409);
    for (const d of [days[1], days[2]]) { const r = await book(d); expect(r.status).toBe(201); refs.push(r.body.refCode); }
    expect((await book(days[3])).status).toBe(429);
  });

  it("locks an account for 15 minutes after five wrong passwords, without saying whether the account exists", async () => {
    const email = "lock-temp@example.test";
    await prisma.adminUser.deleteMany({ where: { email } });
    const u = await prisma.adminUser.create({ data: { email, name: "Lock", passwordHash: await bcrypt.hash("RightPassw0rd!", 10), role: "ADMIN", isDemo: false } });
    try {
      let last: any;
      for (let i = 0; i < 5; i++) last = await request(app).post(api("/auth/login")).send({ email, password: "wrong" + i });
      const unknown = await request(app).post(api("/auth/login")).send({ email: "ghost@example.test", password: "x" });
      expect(last.body.error.message).toBe(unknown.body.error.message);
      const locked = await request(app).post(api("/auth/login")).send({ email, password: "RightPassw0rd!" });
      expect(locked.status).toBe(401); // even the right password is refused while locked
      await prisma.adminUser.update({ where: { id: u.id }, data: { lockedUntil: new Date(Date.now() - 1000) } });
      expect((await request(app).post(api("/auth/login")).send({ email, password: "RightPassw0rd!" })).status).toBe(200);
      expect((await prisma.adminUser.findUniqueOrThrow({ where: { id: u.id } })).failedLogins).toBe(0);
    } finally { await prisma.adminUser.deleteMany({ where: { email } }); }
  });

  it("never locks the public demo account, and can switch it off for a real clinic", async () => {
    for (let i = 0; i < 7; i++) await request(app).post(api("/auth/login")).send({ email: "admin@demo.clinic", password: "nope" + i });
    expect((await request(app).post(api("/auth/login")).send({ email: "admin@demo.clinic", password: "Demo@12345" })).status).toBe(200);
    process.env.DISABLE_DEMO_LOGIN = "true";
    try { expect((await request(app).post(api("/auth/login")).send({ email: "admin@demo.clinic", password: "Demo@12345" })).status).toBe(401); }
    finally { delete process.env.DISABLE_DEMO_LOGIN; }
  });

  it("STAFF can work on requests but cannot change the site, settings or alerts", async () => {
    const email = "staff-temp@example.test";
    await prisma.adminUser.deleteMany({ where: { email } });
    await prisma.adminUser.create({ data: { email, name: "Staff", passwordHash: await bcrypt.hash("StaffPassw0rd!", 10), role: "STAFF", isDemo: false } });
    try {
      const t = (await request(app).post(api("/auth/login")).send({ email, password: "StaffPassw0rd!" })).body.token;
      const h = { Authorization: `Bearer ${t}` };
      expect((await request(app).get(api("/admin/appointments")).set(h)).status).toBe(200);
      expect((await request(app).get(api("/admin/stats")).set(h)).status).toBe(200);
      for (const [m, path] of [["get", "/admin/settings"], ["put", "/admin/settings"], ["get", "/admin/services"], ["post", "/admin/doctors"], ["put", "/admin/timings"], ["get", "/admin/notifications"], ["post", "/admin/notifications/test"], ["post", "/admin/reminders/run"]] as const) {
        const r = await (request(app) as any)[m](api(path)).set(h).send({});
        expect(r.status, `${m} ${path}`).toBe(403);
      }
    } finally { await prisma.adminUser.deleteMany({ where: { email } }); }
  });

  it("serves the API docs only when allowed in production", async () => {
    const env = { NODE_ENV: process.env.NODE_ENV, docs: process.env.ENABLE_DOCS };
    process.env.NODE_ENV = "production";
    try {
      delete process.env.ENABLE_DOCS;
      expect((await request(createApp()).get("/api/openapi.json")).status).toBe(404);
      process.env.ENABLE_DOCS = "true";
      expect((await request(createApp()).get("/api/openapi.json")).status).toBe(200);
    } finally {
      process.env.NODE_ENV = env.NODE_ENV;
      if (env.docs === undefined) delete process.env.ENABLE_DOCS; else process.env.ENABLE_DOCS = env.docs;
    }
  });
});
