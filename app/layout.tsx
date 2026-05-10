import type { Metadata } from "next"
import { ClerkProvider } from '@clerk/nextjs'
import { Cormorant_Garamond, Inter } from 'next/font/google'
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
    <ClerkProvider>
      <html lang="en" className={`${cormorant.variable} ${inter.variable}`}>
        <body className="antialiased font-sans">
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}