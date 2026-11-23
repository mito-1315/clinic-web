import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../db";
import { HttpError, parse } from "../http";
import { requireAuth, signToken } from "../auth";

export const authRouter = Router();

const limiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: process.env.NODE_ENV === "test" ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: () => {
    throw new HttpError(429, "RATE_LIMITED", "Too many attempts, try again later");
  },
});

const dummyHash = bcrypt.hashSync("not-a-real-password", 10);

const MAX_FAILS = 5, LOCK_MS = 15 * 60_000;
// One message for every failure (unknown email, wrong password, locked, demo off) so nothing reveals which accounts exist.
const INVALID = "Wrong email or password. After 5 wrong tries an account is locked for 15 minutes.";

authRouter.post("/login", limiter, async (req, res) => {
  const { email, password } = parse(z.object({ email: z.string().email(), password: z.string().min(1).max(200) }), req.body);
  const user = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? dummyHash); // always hash, so timing does not leak
  const locked = !!user && !user.isDemo && !!user.lockedUntil && user.lockedUntil > new Date(); // the public demo account is never locked out
  const demoOff = !!user?.isDemo && process.env.DISABLE_DEMO_LOGIN === "true";
  if (!user || locked || demoOff || !ok) {
    if (user && !user.isDemo && !locked && !ok) {
      const fails = user.failedLogins + 1;
      await prisma.adminUser.update({ where: { id: user.id }, data: fails >= MAX_FAILS ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MS) } : { failedLogins: fails } });
    }
    throw new HttpError(401, "INVALID_CREDENTIALS", INVALID);
  }
  if (user.failedLogins || user.lockedUntil) await prisma.adminUser.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
  res.json({
    token: signToken({ id: user.id, role: user.role }),
    user: { id: user.id, name: user.name, email: user.email, role: user.role, isDemo: user.isDemo },
  });
});

authRouter.get("/me", requireAuth, async (_req, res) => {
  const u = await prisma.adminUser.findUnique({
    where: { id: res.locals.user.id },
    select: { id: true, name: true, email: true, role: true, isDemo: true },
  });
  if (!u) throw new HttpError(401, "UNAUTHORIZED", "User no longer exists");
  res.json(u);
});

authRouter.patch("/password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = parse(z.object({ currentPassword: z.string(), newPassword: z.string().min(8).max(200) }), req.body);
  const u = await prisma.adminUser.findUnique({ where: { id: res.locals.user.id } });
  if (!u || !(await bcrypt.compare(currentPassword, u.passwordHash))) throw new HttpError(401, "INVALID_CREDENTIALS", "Current password is wrong");
  if (u.isDemo) throw new HttpError(403, "DEMO_ACCOUNT", "Demo account password cannot be changed");
  await prisma.adminUser.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(newPassword, 10), passwordChangedAt: new Date() } });
  res.status(204).end();
});
