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

authRouter.post("/login", limiter, async (req, res) => {
  const { email, password } = parse(z.object({ email: z.string().email(), password: z.string().min(1).max(200) }), req.body);
  const user = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);
  if (!user || !ok) throw new HttpError(401, "INVALID_CREDENTIALS", "Wrong email or password");
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
  await prisma.adminUser.update({ where: { id: u.id }, data: { passwordHash: await bcrypt.hash(newPassword, 10) } });
  res.status(204).end();
});
