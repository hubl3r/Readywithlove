// app/layout.tsx
import type { Metadata } from "next"
import { ClerkProvider } from '@clerk/nextjs'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import { SettingsProvider } from '@/components/SettingsProvider'
import "./globals.css"

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: "ReadyWithLove — The story you leave behind",
  description: "Plan your final affairs, share your story, and leave personal messages for the people who matter most.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      {/* data-scroll-behavior fixes Next.js warning about smooth scroll on route changes */}
      <html lang="en" className={`${cormorant.variable} ${inter.variable}`} data-scroll-behavior="smooth">
        <body className="antialiased font-sans">
          <SettingsProvider>{children}</SettingsProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
