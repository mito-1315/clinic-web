import type { ManagerConfig } from "./ContentManager";

export const serviceConfig: ManagerConfig = {
  title: "Services",
  endpoint: "/admin/services",
  fields: [
    { key: "title", label: "Title", type: "text" },
    { key: "category", label: "Category", type: "text", hint: "e.g. Paediatrics, Adult care, Skin" },
    { key: "description", label: "Description", type: "textarea" },
    { key: "sortOrder", label: "Display order", type: "number" },
    { key: "isActive", label: "Show on website", type: "bool" },
  ],
  itemTitle: (r) => r.title,
  itemSub: (r) => r.category,
  defaults: { sortOrder: 0, isActive: true },
};

export const doctorConfig: ManagerConfig = {
  title: "Doctors & team",
  endpoint: "/admin/doctors",
  fields: [
    { key: "name", label: "Name", type: "text" },
    { key: "role", label: "Role", type: "text", hint: "e.g. Founder, Paediatrician" },
    { key: "qualification", label: "Qualification", type: "text" },
    { key: "experienceYears", label: "Years of experience", type: "number" },
    { key: "visitingDays", label: "Visiting days (if visiting)", type: "text", nullable: true },
    { key: "bio", label: "Short bio", type: "textarea" },
    { key: "photoUrl", label: "Photo URL", type: "url", nullable: true },
    { key: "sortOrder", label: "Display order", type: "number" },
    { key: "isActive", label: "Show on website", type: "bool" },
  ],
  itemTitle: (r) => r.name,
  itemSub: (r) => `${r.role} · ${r.qualification}`,
  defaults: { experienceYears: 0, sortOrder: 0, isActive: true },
};

export const announcementConfig: ManagerConfig = {
  title: "Notices",
  endpoint: "/admin/announcements",
  fields: [
    { key: "title", label: "Title", type: "text" },
    { key: "body", label: "Message", type: "textarea" },
    { key: "startsAt", label: "Show from", type: "datetime" },
    { key: "endsAt", label: "Show until (optional)", type: "datetime", nullable: true },
    { key: "isActive", label: "Active", type: "bool" },
  ],
  itemTitle: (r) => r.title,
  itemSub: (r) => r.body.slice(0, 70),
  defaults: { isActive: true },
};
