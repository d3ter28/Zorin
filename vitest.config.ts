import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // tsconfig uses "jsx": "preserve", so .tsx tests need the react plugin to compile.
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    projects: [
      {
        extends: true,
        test: { name: "unit", environment: "node", include: ["src/**/*.test.ts"] },
      },
      {
        extends: true,
        test: { name: "ui", environment: "jsdom", include: ["src/**/*.test.tsx"] },
      },
    ],
  },
});
