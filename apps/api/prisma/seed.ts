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
    ...[1, 2, 3, 4, 5].map((weekday) => ({ weekday, openTime: "09:00", closeTime: "13:00", note: "Morning and 17:00-21:00 evening" })),
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

  const svc = await prisma.service.findFirst();
  await prisma.appointment.deleteMany();
  const d = (n: number) => new Date(Date.now() + n * 86400000);
  await prisma.appointment.createMany({
    data: [
      { refCode: "LCC-1001", patientName: "Sample Parent A", phone: "9000000001", patientType: "CHILD", age: 4, preferredDate: d(1), preferredSlot: "Morning", serviceId: svc?.id, status: "NEW", consentAt: new Date() },
      { refCode: "LCC-1002", patientName: "Sample Adult B", phone: "9000000002", patientType: "ADULT", age: 20, preferredDate: d(1), preferredSlot: "Evening", status: "CONFIRMED", consentAt: new Date() },
      { refCode: "LCC-1003", patientName: "Sample Parent C", phone: "9000000003", patientType: "CHILD", age: 1, preferredDate: d(2), preferredSlot: "Morning", status: "CANCELLED", consentAt: new Date() },
    ],
  });
}

main().finally(() => prisma.$disconnect());
