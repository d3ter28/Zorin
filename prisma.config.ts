import path from "node:path";
import { defineConfig } from "prisma/config";

const datasourceUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  "file:./dev.db";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: { url: datasourceUrl },
  migrations: { seed: "tsx prisma/seed.ts" },
});
