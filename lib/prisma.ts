// lib/prisma.ts
import { PrismaClient } from '../app/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// In Vercel serverless, every cold start spins up a new Lambda. Without a
// shared pool reference, we'd open a new Postgres pool each time and quickly
// exhaust connections. Stash the pool + client on globalThis so warm
// invocations on the same Lambda reuse them.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  pgPool: Pool | undefined
}

const pool =
  globalForPrisma.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    // Single connection per Lambda — they're single-threaded so >1 wastes slots.
    // Vercel Postgres has a generous limit but other providers don't.
    max: 1,
    // Close idle conns after 10s so a stuck Lambda doesn't hold them forever.
    idleTimeoutMillis: 10_000,
    // Fail fast if Postgres is unreachable rather than hanging the request.
    connectionTimeoutMillis: 10_000,
  })

const adapter = new PrismaPg(pool)

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.pgPool = pool
}
