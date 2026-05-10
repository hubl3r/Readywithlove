'use client'

import { SignInButton, SignUpButton, Show, UserButton } from '@clerk/nextjs'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-stone-100">
      {/* Navigation */}
      <nav className="flex justify-between items-center px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌿</span>
          <span className="text-xl font-serif text-stone-800">ReadyWithLove</span>
        </div>
        <div className="flex items-center gap-4">
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="text-stone-700 hover:text-stone-900 font-medium cursor-pointer">Sign In</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="bg-stone-800 text-white px-6 py-2 rounded-full hover:bg-stone-700 transition cursor-pointer">Get Started</button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link href="/dashboard" className="text-stone-700 hover:text-stone-900 font-medium">Dashboard</Link>
            <UserButton />
          </Show>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-8 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-serif text-stone-900 mb-6 leading-tight">
          Leave a legacy of love,<br />not a list of loose ends.
        </h1>
        <p className="text-xl text-stone-600 mb-10 max-w-2xl mx-auto">
          Plan your final affairs, share your story, and leave personal messages for the people who matter most. Because peace of mind is the greatest gift you can leave behind.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Show when="signed-out">
            <SignUpButton mode="modal">
              <button className="bg-stone-800 text-white px-8 py-4 rounded-full text-lg hover:bg-stone-700 transition cursor-pointer">Start Your Legacy</button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link href="/dashboard" className="bg-stone-800 text-white px-8 py-4 rounded-full text-lg hover:bg-stone-700 transition">
              Go to Dashboard
            </Link>
          </Show>
          <Link href="/about" className="border border-stone-300 text-stone-800 px-8 py-4 rounded-full text-lg hover:bg-stone-100 transition">
            Learn More
          </Link>
        </div>
      </main>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-8 py-20">
        <div className="grid md:grid-cols-3 gap-12">
          <div className="text-center">
            <div className="text-4xl mb-4">📖</div>
            <h3 className="text-xl font-serif text-stone-900 mb-3">Your Life Story</h3>
            <p className="text-stone-600">Build a beautiful timeline of your life with photos, videos, and the stories that made you who you are.</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">💌</div>
            <h3 className="text-xl font-serif text-stone-900 mb-3">Messages for Tomorrow</h3>
            <p className="text-stone-600">Record video and written messages delivered to loved ones on birthdays, weddings, and milestones yet to come.</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-4">🕊️</div>
            <h3 className="text-xl font-serif text-stone-900 mb-3">Final Arrangements</h3>
            <p className="text-stone-600">Pre-arrange your wishes so your family can grieve, not handle paperwork, when the time comes.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 mt-20 py-8 text-center text-stone-500">
        <p>© 2026 ReadyWithLove. Made with care.</p>
      </footer>
    </div>
  )
}