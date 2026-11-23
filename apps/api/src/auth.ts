import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { HttpError } from "./http";
import { prisma } from "./db";

/** Production must not run on a guessable signing secret (e.g. the .env.example placeholder). */
export function assertStrongSecret(s: string, env = process.env.NODE_ENV) {
  if (env === "production" && (s.length < 32 || /change-?me|secret|password|dev-only/i.test(s))) {
    throw new Error("JWT_SECRET must be a random string of at least 32 characters in production");
  }
}

const secret = process.env.JWT_SECRET ?? (process.env.NODE_ENV === "production" ? "" : "dev-only-secret");
if (!secret) throw new Error("JWT_SECRET is required in production");
assertStrongSecret(secret);

export type AuthUser = { id: number; role: "ADMIN" | "STAFF"; isDemo?: boolean };

export const signToken = (u: { id: number; role: "ADMIN" | "STAFF" }) => jwt.sign(u, secret, { expiresIn: "4h", algorithm: "HS256" });

/** Verifies the token, then checks the account still exists and the password has not changed since the token was issued. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) throw new HttpError(401, "UNAUTHORIZED", "Missing token");
  let p: jwt.JwtPayload;
  try {
    p = jwt.verify(h.slice(7), secret, { algorithms: ["HS256"] }) as jwt.JwtPayload;
  } catch {
    throw new HttpError(401, "UNAUTHORIZED", "Invalid or expired token");
  }
  const u = await prisma.adminUser.findUnique({ where: { id: Number(p.id) }, select: { id: true, role: true, isDemo: true, passwordChangedAt: true } });
  if (!u || (u.passwordChangedAt && (p.iat ?? 0) < Math.floor(u.passwordChangedAt.getTime() / 1000))) {
    throw new HttpError(401, "UNAUTHORIZED", "Invalid or expired token");
  }
  res.locals.user = { id: u.id, role: u.role, isDemo: u.isDemo } satisfies AuthUser; // role comes from the database, not the token
  next();
}

export function requireAdmin(_req: Request, res: Response, next: NextFunction) {
  if (res.locals.user?.role !== "ADMIN") throw new HttpError(403, "FORBIDDEN", "Admin role required");
  next();
}

/** In production the public demo login must not be able to make the server message real people. */
export function blockDemoSends(res: Response) {
  if (process.env.NODE_ENV === "production" && res.locals.user?.isDemo) {
    throw new HttpError(403, "DEMO_ACCOUNT", "The demo account cannot send real messages");
  }
}
