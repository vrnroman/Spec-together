import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Use relative asset paths in the production build. This makes the app work no
// matter what subpath (or letter-case) GitHub Pages serves it from
// (e.g. /Spec-together/), without hardcoding the repo name. The app has no
// client-side router, so relative paths are safe.
// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === "build" ? "./" : "/",
}));
