import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import { Prisma } from "@prisma/client";
import { HttpError } from "./http";
import { requireAuth } from "./auth";
import { publicRouter } from "./routes/public";
import { authRouter } from "./routes/auth";
import { adminRouter } from "./routes/admin";
import { openapi } from "./openapi";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: false })); // JSON API; CSP off so Swagger UI assets load
  app.use(cors({ origin: (process.env.CORS_ORIGIN ?? "http://localhost:5173").split(",").map((o) => o.trim().replace(/\/+$/, "")).filter(Boolean) }));
  // Public routes get a small body limit; only authenticated admin requests may upload photos (up to 600kb).
  const small = express.json({ limit: "20kb" });
  app.use((req, res, next) => (req.path.startsWith("/api/v1/admin") ? next() : small(req, res, next)));

  app.get("/api/v1/health", (_q, res) => res.json({ status: "ok" }));
  // API docs describe only the public contract. Off in production unless ENABLE_DOCS=true (the portfolio demo turns it on).
  if (process.env.NODE_ENV !== "production" || process.env.ENABLE_DOCS === "true") {
    app.get("/api/openapi.json", (_q, res) => res.json(openapi));
    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: "Clinic API docs" }));
  }

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/admin", requireAuth, express.json({ limit: "600kb" }), adminRouter);
  app.use("/api/v1", publicRouter);

  app.use((_q, _s, next) => next(new HttpError(404, "NOT_FOUND", "Route not found")));

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
      return;
    }
    if (typeof err === "object" && err && "type" in err && (err as { type: string }).type === "entity.too.large") {
      res.status(413).json({ error: { code: "TOO_LARGE", message: "Request body is too large" } });
      return;
    }
    if (err instanceof SyntaxError && "body" in err) {
      res.status(400).json({ error: { code: "BAD_JSON", message: "Malformed JSON" } });
      return;
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2025") { res.status(404).json({ error: { code: "NOT_FOUND", message: "Record not found" } }); return; }
      if (err.code === "P2002") { res.status(409).json({ error: { code: "CONFLICT", message: "Already exists" } }); return; }
    }
    console.error(err instanceof Error ? err.message : err); // message only: never log request bodies (personal data)
    res.status(500).json({ error: { code: "INTERNAL", message: "Something went wrong" } });
  });

  return app;
}
