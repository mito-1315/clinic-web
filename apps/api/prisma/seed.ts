import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Demo credentials: fake, for the public showcase only.
  await prisma.adminUser.upsert({
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

  await prisma.service.deleteMany();
  await prisma.service.createMany({
    data: [
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
      { name: "Dr. Sample Lakshmi", role: "Founder, Paediatrician", qualification: "MBBS, MD (Paediatrics)", experienceYears: 30, sortOrder: 1, bio: "Sample profile: a senior paediatrician with decades of experience and an active member of professional medical associations." },
      { name: "Dr. Sample Raman", role: "Founder, Physician", qualification: "MBBS, MD (General Medicine)", experienceYears: 32, sortOrder: 2, bio: "Sample profile: a general physician caring for families across generations." },
      { name: "Dr. Sample Meena", role: "Visiting Dermatologist", qualification: "MBBS, MD (Dermatology)", experienceYears: 15, visitingDays: "Saturday", sortOrder: 3, bio: "Sample profile: skin, hair and nail care." },
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
    data: { title: "Demo website", body: "This is a sample website with fictional content." },
  });

  const settings = {
    name: "Lakshmi Child Care Center",
    phone: "+91 90000 00000",
    whatsapp: "919000000000",
    email: "hello@example.com",
    address: "Murugan Koil Road, Kundrathur, Chennai (sample address)",
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.clinicSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
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
      consentAt: new Date(),
      createdAt: new Date(Date.now() - Math.floor(i / 2.5) * day - (i % 4) * 3600_000),
    })),
  });
}

main().finally(() => prisma.$disconnect());
