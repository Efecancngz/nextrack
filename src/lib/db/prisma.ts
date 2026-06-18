import { PrismaClient } from "../../generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

/**
 * Singleton Prisma client. Real Neon URLs (production) use the Neon
 * serverless driver adapter; local Postgres (Docker dev) uses the plain
 * node-postgres adapter, since Neon's adapter speaks a WebSocket proxy
 * protocol that a vanilla Postgres server doesn't implement.
 */

if (typeof window === "undefined" && typeof globalThis.WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionString = process.env.DATABASE_URL || "postgresql://mock:mock@localhost:5432/mock";

const isLocalDatabase = /localhost|127\.0\.0\.1/.test(connectionString);

const adapter = isLocalDatabase
  ? new PrismaPg({ connectionString })
  : new PrismaNeon({ connectionString });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
