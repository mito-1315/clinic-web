import type { ZodTypeAny, z } from "zod";

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) {
    super(message);
  }
}

export function parse<T extends ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid input", r.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
  }
  return r.data;
}

export function intParam(v: unknown): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new HttpError(400, "VALIDATION_ERROR", "Invalid id");
  return n;
}
