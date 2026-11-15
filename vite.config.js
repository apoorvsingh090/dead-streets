import { defineConfig } from "vite";

// Relative base so the built game runs from any sub-path (itch.io),
// from file:// (Electron/Steam wrapper), and from domain root alike.
export default defineConfig({
  base: "./",
});
