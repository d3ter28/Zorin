import { PrismaNeonHttp } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const connectionString =
  process.env.DATABASE_URL ?? "postgres://user:password@localhost:5432/zorin";
const adapter = new PrismaNeonHttp(connectionString, {});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
