'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo from './Logo'

export default function Footer() {
  const pathname = usePathname() || '/'
  if (pathname.startsWith('/admin') || pathname.startsWith('/dashboard')) return null

  return (
    <footer className="bg-gradient-to-b from-white to-gray-50 border-t border-gray-200 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2 md:col-span-2">
            <div className="mb-3">
              <Logo size="lg" href={null} />
            </div>
            <p className="text-sm text-gray-500 leading-relaxed max-w-sm">
              Ontario's live physician-to-physician referral platform. Real-time availability,
              wait times, and referral criteria, so referrals get accepted, not rejected.
            </p>
            <p className="text-[11px] text-gray-400 mt-4">© {new Date().getFullYear()} ReferEasy · Ontario, Canada</p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/search" className="text-gray-600 hover:text-brand transition">Find Care</Link></li>
              <li><Link href="/pricing" className="text-gray-600 hover:text-brand transition">Pricing</Link></li>
              <li><Link href="/signup" className="text-gray-600 hover:text-brand transition">List your practice</Link></li>
              <li><Link href="/login" className="text-gray-600 hover:text-brand transition">Sign in</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/blog" className="text-gray-600 hover:text-brand transition">Blog</Link></li>
              <li><Link href="/#faq" className="text-gray-600 hover:text-brand transition">FAQ</Link></li>
              <li><a href="mailto:hello@refereasy.ca" className="text-gray-600 hover:text-brand transition">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="text-gray-600 hover:text-brand transition">About us</Link></li>
              <li><Link href="/privacy" className="text-gray-600 hover:text-brand transition">Privacy</Link></li>
              <li><Link href="/terms" className="text-gray-600 hover:text-brand transition">Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-gray-400">Built for referring physicians across Ontario. Not affiliated with CPSO or the Ministry of Health.</p>
          <div className="flex items-center gap-4 text-[11px] text-gray-400">
            <span>🇨🇦 Made in Ontario</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
