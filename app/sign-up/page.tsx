// app/sign-up/page.tsx
//
// Branded sign-up page. Renders the shared animated auth surface in sign-up
// mode; the in-page toggle switches to sign-in without a route change. Public
// route (see proxy.ts). Uses Clerk's hash routing, so no catch-all needed.

import AuthSurface from '@/components/AuthSurface'

export const metadata = {
  title: 'Begin your story · Ready with Love',
}

export default function SignUpPage() {
  return <AuthSurface initialMode="sign-up" />
}
