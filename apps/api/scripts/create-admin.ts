import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

// Creates (or resets) a real admin account.  npm run admin:create -- owner@clinic.com "Dr. Lakshmi"
// Set ADMIN_PASSWORD yourself, or leave it unset and a strong random password is printed once, only in this terminal.
const prisma = new PrismaClient();
const email = (process.argv[2] ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const name = process.argv[3] ?? "Clinic Admin";
const role = process.env.ADMIN_ROLE === "STAFF" ? "STAFF" : "ADMIN";
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Usage: npm run admin:create -- owner@clinic.com "Name"   (ADMIN_ROLE=STAFF for a limited account)');
  process.exit(1);
}
const given = process.env.ADMIN_PASSWORD;
if (given && given.length < 10) { console.error("ADMIN_PASSWORD must be at least 10 characters."); process.exit(1); }
const password = given || randomBytes(12).toString("base64url");
const passwordHash = await bcrypt.hash(password, 10);
await prisma.adminUser.upsert({
  where: { email },
  update: { passwordHash, passwordChangedAt: new Date(), failedLogins: 0, lockedUntil: null, role, isDemo: false },
  create: { email, name, role, isDemo: false, passwordHash },
});
console.log(`${role} account ready: ${email}`);
if (!given) console.log(`Temporary password (shown once, change it after signing in): ${password}`);
await prisma.$disconnect();
