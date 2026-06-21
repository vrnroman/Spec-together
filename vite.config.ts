import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// When deployed to GitHub Pages as a project site, the app is served from
// https://<user>.github.io/<repo>/ so we need the matching base path in
// production. Locally (dev/preview) we serve from root.
// Override with SPEC_TOGETHER_BASE if your repo name differs.
const base = process.env.SPEC_TOGETHER_BASE ?? "/spec-together/";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? base : "/",
}));
