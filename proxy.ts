// proxy.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/about',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/cron/(.*)',

  // Zip 2c.1 — Contribution flow for invitees with no account.
  '/contribute(.*)',
  '/api/contributions(.*)',

  // Zip 2c.3 — AI text cleanup endpoint. Used by both authed users and
  // unauthed contributors (the LetterEditor's "Polish with AI" button).
  // The endpoint itself enforces in-memory IP rate limits and has no
  // database access, so making it public is safe.
  '/api/ai/cleanup-text',

  // Zip 2c.6 — Recipient delivery view. The token IS the credential
  // here, and the page itself verifies linkRevokedAt before rendering
  // content. No Clerk session required; the recipient is by definition
  // someone outside the app.
  '/m/(.*)',
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
