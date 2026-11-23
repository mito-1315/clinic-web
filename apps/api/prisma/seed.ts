import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// The seed REPLACES services, doctors, timings and all requests. Against anything but a local database, require an explicit yes.
const url = process.env.DATABASE_URL ?? "";
if (!/localhost|127\.0\.0\.1/.test(url) && process.env.CONFIRM_SEED !== "yes") {
  console.error("Refusing to seed a non-local database. This deletes and recreates the demo data.\nIf that is what you want, set CONFIRM_SEED=yes for this one command.");
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  // Demo credentials: fake, for the public showcase only.
  // A hosted database gets no public demo login unless SEED_DEMO_ADMIN=yes.
  if (/localhost|127\.0\.0\.1/.test(url) || process.env.SEED_DEMO_ADMIN === "yes") await prisma.adminUser.upsert({
    where: { email: "admin@demo.clinic" },
    update: {},
    create: {
      email: "admin@demo.clinic",
      name: "Demo Admin",
      role: "ADMIN",
      isDemo: true,
      passwordHash: await bcrypt.hash("Demo@12345", 10),
    },
  });

  await prisma.notification.deleteMany();
  await prisma.service.deleteMany();
  await prisma.service.createMany({
    data: [
      { title: "Child care", category: "Paediatrics", sortOrder: 0, description: "Newborn and well-baby care, feeding and growth guidance, and everyday parenting advice." },
      { title: "Child health & paediatrics", category: "Paediatrics", sortOrder: 1, description: "Check-ups, growth and development monitoring, and treatment of common childhood illnesses." },
      { title: "Vaccination", category: "Paediatrics", sortOrder: 2, description: "Routine childhood immunisation as per the national schedule." },
      { title: "General medicine for adults", category: "Adult care", sortOrder: 3, description: "Fever, cough, cold, infections and everyday health concerns for adults." },
      { title: "Health check-ups", category: "Adult care", sortOrder: 4, description: "Basic screening for blood pressure, sugar and general wellbeing." },
      { title: "Skin care (Saturdays)", category: "Skin", sortOrder: 5, description: "Visiting dermatologist consultations every Saturday." },
      { title: "Minor procedures & dressings", category: "Procedures", sortOrder: 6, description: "Wound care, dressings and injections by our trained nursing staff." },
    ],
  });

  await prisma.doctor.deleteMany();
  await prisma.doctor.createMany({
    data: [
      { name: "Dr. Lakshmi", role: "Founder, Paediatrician", qualification: "MBBS, MD (Paediatrics)", experienceYears: 30, photoUrl: "/photos/smile-960.jpg", sortOrder: 1, bio: "A senior paediatrician with decades of experience and an active member of professional medical associations." },
      { name: "Dr. Raman", role: "Founder, Physician", qualification: "MBBS, MD (General Medicine)", experienceYears: 32, photoUrl: "/photos/desk-960.jpg", sortOrder: 2, bio: "A general physician caring for families across generations." },
      { name: "Dr. Meena", role: "Visiting Dermatologist", qualification: "MBBS, MD (Dermatology)", experienceYears: 15, visitingDays: "Saturday", photoUrl: "/photos/stetho-960.jpg", sortOrder: 3, bio: "Skin, hair and nail care for children and adults." },
    ],
  });

  const days = [
    { weekday: 0, isClosed: true, note: "Closed (emergencies by phone)" },
    ...[1, 2, 3, 4, 5].map((weekday) => ({ weekday, openTime: "09:00", closeTime: "13:00", open2Time: "17:00", close2Time: "21:00", note: null as string | null })),
    { weekday: 6, openTime: "09:00", closeTime: "13:00", note: "Skin clinic with visiting dermatologist" },
  ];
  await prisma.timing.deleteMany();
  await prisma.timing.createMany({ data: days });

  await prisma.announcement.deleteMany();
  await prisma.announcement.create({
    data: { title: "Saturday skin clinic", body: "Dr. Meena, visiting dermatologist, consults every Saturday 9 AM to 1 PM." },
  });

  const settings = {
    name: "Lakshmi Child Care Center",
    phone: "+91 98765 43210",
    whatsapp: "919876543210",
    email: "hello@example.com",
    address: "Murugan Koil Road, Kundrathur, Chennai",
    notifyPhone: "+910000000000", // placeholder that cannot reach anyone; set the real number in admin, Alerts
    notifyEmail: "owner@lakshmi-childcare.example",
  };
  for (const [key, value] of Object.entries(settings)) {
    // alert contacts belong to the owner: re-seeding must never overwrite them
    await prisma.clinicSetting.upsert({ where: { key }, update: key.startsWith("notify") ? {} : { value }, create: { key, value } });
  }

  const services = await prisma.service.findMany({ orderBy: { id: "asc" } });
  await prisma.appointment.deleteMany();
  const names: [string, "CHILD" | "ADULT", number][] = [
    ["Sample Parent A", "CHILD", 4], ["Sample Adult B", "ADULT", 20], ["Sample Parent C", "CHILD", 1], ["Sample Adult D", "ADULT", 34],
    ["Sample Parent E", "CHILD", 7], ["Sample Adult F", "ADULT", 52], ["Sample Parent G", "CHILD", 2], ["Sample Adult H", "ADULT", 27],
    ["Sample Parent I", "CHILD", 9], ["Sample Adult J", "ADULT", 41], ["Sample Parent K", "CHILD", 3], ["Sample Adult L", "ADULT", 63],
    ["Sample Parent M", "CHILD", 6], ["Sample Adult N", "ADULT", 30], ["Sample Parent O", "CHILD", 5], ["Sample Adult P", "ADULT", 22],
  ];
  const statuses = ["NEW", "CONFIRMED", "COMPLETED", "NEW", "CONFIRMED", "CANCELLED"] as const;
  const day = 86400000;
  await prisma.appointment.createMany({
    data: names.map(([patientName, patientType, age], i) => ({
      refCode: `LCC-${1001 + i}`,
      patientName,
      phone: `90000000${String(i + 1).padStart(2, "0")}`,
      patientType,
      age,
      preferredDate: new Date(new Date(Date.now() + ((i % 5) + 1) * day).toISOString().slice(0, 10)),
      preferredSlot: i % 3 === 0 ? "Evening" : "Morning",
      serviceId: services[i % services.length].id,
      status: statuses[i % statuses.length],
      wantsReminder: false, // sample patients use made-up numbers: they must never receive a real reminder
      consentAt: new Date(),
      createdAt: new Date(Date.now() - Math.floor(i / 2.5) * day - (i % 4) * 3600_000),
    })),
  });
}

main().finally(() => prisma.$disconnect());
