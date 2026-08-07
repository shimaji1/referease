'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const KEY = 're-cookie-consent'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setVisible(true)
  }, [])

  const accept = () => {
    localStorage.setItem(KEY, 'accepted')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-[200] bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
        <p className="text-xs text-gray-600 leading-relaxed flex-1">
          We use necessary cookies to keep you signed in, and first-party analytics cookies to understand how the site is used.
          We don't use third-party advertising cookies. See our{' '}
          <Link href="/privacy" className="text-brand font-medium hover:underline">Privacy Policy</Link> for details.
        </p>
        <button onClick={accept} className="shrink-0 px-5 py-2 bg-brand text-white text-xs font-bold rounded-lg hover:bg-brand-dark transition">
          Got it
        </button>
      </div>
    </div>
  )
}
