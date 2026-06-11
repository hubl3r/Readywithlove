// lib/clerk-appearance.ts
//
// Branded Clerk `appearance` for the custom auth surface (components/
// AuthSurface.tsx). The goal is for Clerk's prebuilt <SignIn>/<SignUp> to stop
// looking like Clerk and dissolve into the "Ready with Love" page: no card
// chrome, brand palette, our fonts, and our own header/footer (we render the
// headline and the sign-in/sign-up toggle ourselves, so Clerk's are hidden).
//
// Element/variable keys Clerk doesn't recognize are ignored at runtime, so this
// stays safe across Clerk minor versions. Brand tokens mirror globals.css
// (--rwl-cream #f5f1e8, --rwl-deep #2c2416, --rwl-bronze #8b6f3a,
// --rwl-body #5c4d2e).

export const authAppearance = {
  variables: {
    colorPrimary: '#2c2416',
    colorText: '#2c2416',
    colorTextSecondary: '#5c4d2e',
    colorBackground: 'transparent',
    colorInputBackground: '#f5f1e8',
    colorInputText: '#2c2416',
    colorDanger: '#c0392b',
    fontFamily: 'var(--font-sans)',
    borderRadius: '0.125rem',
    spacingUnit: '1rem',
  },
  elements: {
    rootBox: 'w-full',
    cardBox: 'w-full shadow-none border-0',
    card: 'bg-transparent shadow-none border-0 p-0 gap-6',
    // We render our own animated headline — hide Clerk's.
    header: 'hidden',
    headerTitle: 'hidden',
    headerSubtitle: 'hidden',
    // We render our own animated sign-in/sign-up toggle — hide Clerk's footer
    // (also removes the "Secured by Clerk" badge in production).
    footer: 'hidden',
    footerAction: 'hidden',
    socialButtonsBlockButton:
      'border border-[#8b6f3a]/30 bg-[#fbf8f0]/70 hover:bg-[#8b6f3a]/[0.06] text-[#2c2416] rounded-sm transition',
    socialButtonsBlockButtonText: 'font-sans text-sm',
    dividerLine: 'bg-[#8b6f3a]/20',
    dividerText:
      'font-sans text-[10px] uppercase tracking-[0.2em] text-[#8b6f3a]',
    formFieldLabel:
      'font-sans text-[10px] uppercase tracking-[0.2em] text-[#8b6f3a]',
    formFieldInput:
      'font-sans bg-[#f5f1e8] border border-[#8b6f3a]/25 text-[#2c2416] rounded-sm focus:border-[#8b6f3a] transition',
    formButtonPrimary:
      'font-sans text-xs normal-case tracking-[0.2em] uppercase bg-[#2c2416] hover:bg-[#8b6f3a] text-[#f5f1e8] rounded-sm transition',
    formFieldAction: 'text-[#8b6f3a] hover:text-[#2c2416] transition',
    formFieldInputShowPasswordButton: 'text-[#8b6f3a] hover:text-[#2c2416]',
    formResendCodeLink: 'text-[#8b6f3a] hover:text-[#2c2416]',
    otpCodeFieldInput: 'border-[#8b6f3a]/30 text-[#2c2416]',
    identityPreviewText: 'font-sans text-[#2c2416]',
    identityPreviewEditButton: 'text-[#8b6f3a] hover:text-[#2c2416]',
    footerActionLink: 'text-[#8b6f3a] hover:text-[#2c2416]',
    spinner: 'text-[#8b6f3a]',
  },
  layout: {
    socialButtonsPlacement: 'top' as const,
    showOptionalFields: true,
  },
}
