import { Link, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./admin/AdminLayout";
import { Login } from "./admin/Login";
import { Overview } from "./admin/Overview";
import { Appointments } from "./admin/Appointments";
import { ContentManager } from "./admin/ContentManager";
import { Timings } from "./admin/Timings";
import { Settings } from "./admin/Settings";
import { announcementConfig, doctorConfig, serviceConfig } from "./admin/configs";

function PublicPlaceholder() {
  return (
    <main className="mx-auto max-w-xl p-6 text-center">
      <h1 className="mt-16 text-3xl font-bold text-brand-700">Lakshmi Child Care Center</h1>
      <p className="mt-3 text-stone-600">Public website coming next. Demo site with fictional content.</p>
      <Link to="/admin" className="btn btn-primary mt-6">Open admin dashboard</Link>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicPlaceholder />} />
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
      <Route path="*" element={<PublicPlaceholder />} />
    </Routes>
  );
}
