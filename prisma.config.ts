import path from "node:path";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer auto-loads .env when a prisma.config.ts is present, so the
// SQLite path is set directly here for migration/introspection commands. The
// runtime client (src/lib/db.ts) reads process.env.DATABASE_URL, which Next.js
// auto-loads from .env. Both resolve to ./dev.db at the project root.
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: { url: "file:./dev.db" },
  migrations: { seed: "tsx prisma/seed.ts" },
});
