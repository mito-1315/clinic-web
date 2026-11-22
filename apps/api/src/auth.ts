import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { HttpError } from "./http";

const secret = process.env.JWT_SECRET ?? (process.env.NODE_ENV === "production" ? "" : "dev-only-secret");
if (!secret) throw new Error("JWT_SECRET is required in production");

export type AuthUser = { id: number; role: "ADMIN" | "STAFF" };

export const signToken = (u: AuthUser) => jwt.sign(u, secret, { expiresIn: "8h" });

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) throw new HttpError(401, "UNAUTHORIZED", "Missing token");
  try {
    const p = jwt.verify(h.slice(7), secret) as AuthUser;
    res.locals.user = { id: p.id, role: p.role } satisfies AuthUser;
  } catch {
    throw new HttpError(401, "UNAUTHORIZED", "Invalid or expired token");
  }
  next();
}

export function requireAdmin(_req: Request, res: Response, next: NextFunction) {
  if (res.locals.user?.role !== "ADMIN") throw new HttpError(403, "FORBIDDEN", "Admin role required");
  next();
}
