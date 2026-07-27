import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function makeClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("postgres")) {
    // Production: Prisma 7 requires a driver adapter — datasourceUrl is gone.
    const adapter = new PrismaNeon({ connectionString: url });
    return new PrismaClient({ adapter });
  }
  // Local dev: SQLite via BetterSqlite3 adapter.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
  const adapter = new PrismaBetterSqlite3({ url: url || "file:./dev.db" });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? makeClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
