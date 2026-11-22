// Hand-written OpenAPI 3 spec served at /api/docs. Keep in sync with routes.
const ref = (n: string) => ({ $ref: `#/components/schemas/${n}` });
const body = (schema: object) => ({ required: true, content: { "application/json": { schema } } });
const ok = (description: string, schema?: object) => ({
  description,
  ...(schema && { content: { "application/json": { schema } } }),
});
const err = { description: "Error", content: { "application/json": { schema: ref("Error") } } };
const auth = [{ bearerAuth: [] }];
const idParam = { name: "id", in: "path", required: true, schema: { type: "integer" } };
const arr = (n: string) => ({ type: "array", items: ref(n) });

const crudPaths = (base: string, tag: string, schema: string, input: string) => ({
  [`/admin/${base}`]: {
    get: { tags: [tag], security: auth, summary: `List ${base}`, responses: { 200: ok("OK", arr(schema)), 401: err } },
    post: { tags: [tag], security: auth, summary: `Create ${schema}`, requestBody: body(ref(input)), responses: { 201: ok("Created", ref(schema)), 400: err, 401: err } },
  },
  [`/admin/${base}/{id}`]: {
    put: { tags: [tag], security: auth, summary: `Update ${schema} (partial)`, parameters: [idParam], requestBody: body(ref(input)), responses: { 200: ok("Updated", ref(schema)), 400: err, 404: err } },
    delete: { tags: [tag], security: auth, summary: `Delete ${schema}`, parameters: [idParam], responses: { 204: { description: "Deleted" }, 404: err } },
  },
});

const str = { type: "string" };
const int = { type: "integer" };
const bool = { type: "boolean" };
const status = { type: "string", enum: ["NEW", "CONFIRMED", "CANCELLED", "COMPLETED"] };

export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Lakshmi Child Care Center API (demo)",
    version: "1.0.0",
    description:
      "REST API for a demo clinic website. All data is fictional. Admin endpoints need a Bearer token from `POST /auth/login`. " +
      "Demo login: `admin@demo.clinic` / `Demo@12345`. No medical records are stored.",
  },
  servers: [{ url: "/api/v1" }],
  tags: [{ name: "Public" }, { name: "Auth" }, { name: "Appointments" }, { name: "Services" }, { name: "Doctors" }, { name: "Announcements" }, { name: "Timings" }, { name: "Settings" }],
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
    schemas: {
      Error: { type: "object", properties: { error: { type: "object", properties: { code: str, message: str, details: {} } } } },
      Service: { type: "object", properties: { id: int, title: str, description: str, category: str, sortOrder: int, isActive: bool } },
      ServiceInput: { type: "object", required: ["title", "description", "category"], properties: { title: str, description: str, category: str, sortOrder: int, isActive: bool } },
      Doctor: { type: "object", properties: { id: int, name: str, role: str, qualification: str, experienceYears: int, bio: str, photoUrl: { type: "string", nullable: true }, visitingDays: { type: "string", nullable: true }, sortOrder: int, isActive: bool } },
      DoctorInput: { type: "object", required: ["name", "role", "qualification", "experienceYears", "bio"], properties: { name: str, role: str, qualification: str, experienceYears: int, bio: str, photoUrl: { type: "string", format: "uri", nullable: true }, visitingDays: { type: "string", nullable: true }, sortOrder: int, isActive: bool } },
      Announcement: { type: "object", properties: { id: int, title: str, body: str, startsAt: { type: "string", format: "date-time" }, endsAt: { type: "string", format: "date-time", nullable: true }, isActive: bool } },
      AnnouncementInput: { type: "object", required: ["title", "body"], properties: { title: str, body: str, startsAt: { type: "string", format: "date-time" }, endsAt: { type: "string", format: "date-time", nullable: true }, isActive: bool } },
      Timing: { type: "object", required: ["weekday"], properties: { weekday: { type: "integer", minimum: 0, maximum: 6, description: "0 = Sunday" }, openTime: { type: "string", example: "09:00", nullable: true }, closeTime: { type: "string", example: "13:00", nullable: true }, isClosed: bool, note: { type: "string", nullable: true } } },
      TimingOverride: { type: "object", required: ["date", "reason"], properties: { date: { type: "string", example: "2026-12-25" }, isClosed: bool, openTime: { type: "string", nullable: true }, closeTime: { type: "string", nullable: true }, reason: str } },
      AppointmentInput: {
        type: "object",
        required: ["patientName", "phone", "patientType", "age", "preferredDate", "preferredSlot", "consent"],
        properties: {
          patientName: str, phone: { type: "string", example: "9876543210" }, patientType: { type: "string", enum: ["CHILD", "ADULT"] }, age: int,
          preferredDate: { type: "string", example: "2026-12-01" }, preferredSlot: { type: "string", enum: ["Morning", "Evening"] },
          serviceId: int, note: { type: "string", maxLength: 300, description: "Non-medical note" }, consent: { type: "boolean", enum: [true] },
          website: { type: "string", description: "Honeypot. Leave empty." },
        },
      },
      Appointment: { type: "object", properties: { id: int, refCode: str, patientName: str, phone: str, patientType: str, age: int, preferredDate: str, preferredSlot: str, serviceId: { type: "integer", nullable: true }, note: { type: "string", nullable: true }, status, staffNote: { type: "string", nullable: true }, createdAt: str, updatedAt: str } },
    },
  },
  paths: {
    "/health": { get: { tags: ["Public"], summary: "Health check", responses: { 200: ok("OK") } } },
    "/services": { get: { tags: ["Public"], summary: "Active services", responses: { 200: ok("OK", arr("Service")) } } },
    "/doctors": { get: { tags: ["Public"], summary: "Active doctors and staff", responses: { 200: ok("OK", arr("Doctor")) } } },
    "/timings": { get: { tags: ["Public"], summary: "Weekly timings and upcoming overrides", responses: { 200: ok("OK") } } },
    "/announcements/active": { get: { tags: ["Public"], summary: "Currently active announcements", responses: { 200: ok("OK", arr("Announcement")) } } },
    "/settings/public": { get: { tags: ["Public"], summary: "Clinic contact info", responses: { 200: ok("OK") } } },
    "/appointments": {
      post: {
        tags: ["Public"], summary: "Submit an appointment request (not a confirmed booking)",
        description: "Rate limited to 10 per hour per IP.",
        requestBody: body(ref("AppointmentInput")),
        responses: { 201: ok("Created: returns refCode"), 400: err, 429: err },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"], summary: "Log in",
        requestBody: body({ type: "object", required: ["email", "password"], properties: { email: { type: "string", example: "admin@demo.clinic" }, password: { type: "string", example: "Demo@12345" } } }),
        responses: { 200: ok("Token and user"), 401: err, 429: err },
      },
    },
    "/auth/me": { get: { tags: ["Auth"], security: auth, summary: "Current user", responses: { 200: ok("OK"), 401: err } } },
    "/auth/password": {
      patch: {
        tags: ["Auth"], security: auth, summary: "Change own password",
        requestBody: body({ type: "object", required: ["currentPassword", "newPassword"], properties: { currentPassword: str, newPassword: { type: "string", minLength: 8 } } }),
        responses: { 204: { description: "Changed" }, 401: err, 403: err },
      },
    },
    "/admin/appointments": {
      get: {
        tags: ["Appointments"], security: auth, summary: "List appointment requests",
        parameters: [
          { name: "page", in: "query", schema: int }, { name: "limit", in: "query", schema: { type: "integer", maximum: 100 } },
          { name: "status", in: "query", schema: status }, { name: "patientType", in: "query", schema: { type: "string", enum: ["CHILD", "ADULT"] } },
          { name: "date", in: "query", schema: str, description: "Preferred date, YYYY-MM-DD" }, { name: "q", in: "query", schema: str, description: "Search name, phone or ref code" },
        ],
        responses: { 200: ok("Paginated list: { data, meta }"), 401: err },
      },
    },
    "/admin/appointments/{id}": {
      get: { tags: ["Appointments"], security: auth, summary: "Appointment detail", parameters: [idParam], responses: { 200: ok("OK", ref("Appointment")), 404: err } },
      patch: {
        tags: ["Appointments"], security: auth, summary: "Update status or staff note", parameters: [idParam],
        requestBody: body({ type: "object", properties: { status, staffNote: { type: "string", nullable: true } } }),
        responses: { 200: ok("Updated", ref("Appointment")), 400: err, 404: err },
      },
    },
    "/admin/stats": { get: { tags: ["Appointments"], security: auth, summary: "Dashboard counts", responses: { 200: ok("{ total, today, byStatus }") } } },
    ...crudPaths("services", "Services", "Service", "ServiceInput"),
    ...crudPaths("doctors", "Doctors", "Doctor", "DoctorInput"),
    ...crudPaths("announcements", "Announcements", "Announcement", "AnnouncementInput"),
    "/admin/timings": { put: { tags: ["Timings"], security: auth, summary: "Replace weekly timings (1-7 rows, upsert by weekday)", requestBody: body(arr("Timing")), responses: { 200: ok("OK", arr("Timing")), 400: err } } },
    "/admin/timing-overrides": { post: { tags: ["Timings"], security: auth, summary: "Add or update a holiday/special-day override", requestBody: body(ref("TimingOverride")), responses: { 201: ok("Created"), 400: err } } },
    "/admin/timing-overrides/{id}": { delete: { tags: ["Timings"], security: auth, summary: "Remove an override", parameters: [idParam], responses: { 204: { description: "Deleted" }, 404: err } } },
    "/admin/settings": {
      get: { tags: ["Settings"], security: auth, summary: "Clinic settings", responses: { 200: ok("OK") } },
      put: { tags: ["Settings"], security: auth, summary: "Update clinic settings (any of: name, phone, whatsapp, email, address, mapUrl)", requestBody: body({ type: "object" }), responses: { 200: ok("OK"), 400: err } },
    },
  },
};
