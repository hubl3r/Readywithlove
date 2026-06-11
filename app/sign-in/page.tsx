// app/sign-in/page.tsx
//
// Branded sign-in page. Renders the shared animated auth surface in sign-in
// mode; the in-page toggle switches to sign-up without a route change. Public
// route (see proxy.ts). Uses Clerk's hash routing, so no catch-all needed.

import AuthSurface from '@/components/AuthSurface'

export const metadata = {
  title: 'Sign in · Ready with Love',
}

export default function SignInPage() {
  return <AuthSurface initialMode="sign-in" />
}
