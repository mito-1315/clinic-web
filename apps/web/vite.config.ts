import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command }) => {
  if (command === "build" && !process.env.VITE_API_URL) {
    console.warn("\n[clinic-web] VITE_API_URL is not set. The built site will call /api on its own domain, which only works behind a proxy. Set it to your API address (no trailing slash).\n");
  }
  return {
    plugins: [react(), tailwindcss()],
    server: { port: 5173, proxy: { "/api": "http://localhost:4000" } },
  };
});
