import { Route, Routes } from "react-router-dom";
import { AdminLayout } from "./admin/AdminLayout";
import { Login } from "./admin/Login";
import { Overview } from "./admin/Overview";
import { Appointments } from "./admin/Appointments";
import { ContentManager } from "./admin/ContentManager";
import { Timings } from "./admin/Timings";
import { Settings } from "./admin/Settings";
import { announcementConfig, doctorConfig, serviceConfig } from "./admin/configs";
import { PublicLayout } from "./pub/PublicLayout";
import { Home } from "./pub/Home";
import { About, Contact, Doctors, Privacy, Services } from "./pub/Pages";
import { Book } from "./pub/Book";

export function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/doctors" element={<Doctors />} />
        <Route path="/services" element={<Services />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/book" element={<Book />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="*" element={<Home />} />
      </Route>
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Overview />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="services" element={<ContentManager {...serviceConfig} />} />
        <Route path="doctors" element={<ContentManager {...doctorConfig} />} />
        <Route path="announcements" element={<ContentManager {...announcementConfig} />} />
        <Route path="timings" element={<Timings />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}
