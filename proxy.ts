// proxy.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Routes that don't require a signed-in Clerk session. Everything else is
// gated by auth.protect() below — that's how dashboard pages bounce to
// sign-in automatically.
//
// IMPORTANT: when adding new public-facing flows (anything an unauth'd
// recipient or contributor needs to hit), add them here. Otherwise users
// get sent to sign-in.
const isPublicRoute = createRouteMatcher([
  '/',
  '/about',
  '/sign-in(.*)',
  '/sign-up(.*)',

  // Zip 2c.1 — Contribution flow for invitees with no account.
  //   /contribute/[token]            → landing page
  //   /contribute/[token]/thanks     → confirmation
  '/contribute(.*)',

  // The contribution submit + Vercel Blob client-upload-token endpoints.
  // Both are token-gated internally (the invite token IS the auth).
  '/api/contributions(.*)',

  // Future: when 2b's recipient-facing message delivery flow lands, the
  // public read path will need to be added here too — something like
  // '/m/(.*)' for /m/[deliveryToken]. Not yet wired up so leaving it off.
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
