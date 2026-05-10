// lib/userBootstrap.ts
import { prisma } from './prisma'

/**
 * Ensure the User row exists for a given Clerk userId. Every API route does
 * this; centralizing avoids drift if we ever change defaults.
 */
export async function ensureUser(userId: string) {
  return prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: userId, // Clerk userId placeholder; real email synced later
    },
  })
}
