import { copyFileSync } from "fs";
import { join } from "path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");

copyFileSync(
  join(root, "prisma", "schema.production.prisma"),
  join(root, "prisma", "schema.prisma"),
);

console.log("[prepare-prod] prisma/schema.prisma patched to PostgreSQL for production build");
