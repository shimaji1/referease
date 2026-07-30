'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function TopNav() {
  const pathname = usePathname() || '/'
  const { user } = useAuth() || {}
  const linkCls = (href) => {
    const active = pathname === href || (href !== '/' && pathname.startsWith(href))
    return `text-sm font-medium transition ${active ? 'text-brand' : 'text-gray-600 hover:text-brand'}`
  }
  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img src="/img/icon.png" alt="ReferEasy" className="w-10 h-10 rounded-lg" />
          <span className="text-xl font-bold text-gray-900">Refer<span className="text-[#2563eb]">Easy</span></span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-5">
          <Link href="/search" className={linkCls('/search') + ' hidden sm:inline'}>Find Care</Link>
          <Link href="/pricing" className={linkCls('/pricing') + ' hidden sm:inline'}>Pricing</Link>
          <Link href="/blog" className={linkCls('/blog') + ' hidden md:inline'}>Blog</Link>
          <Link href="/about" className={linkCls('/about') + ' hidden md:inline'}>About</Link>
          {user
            ? <Link href="/dashboard" className="text-sm font-semibold text-white bg-brand px-4 py-1.5 rounded-lg hover:bg-brand-dark transition">Dashboard</Link>
            : (
              <>
                <Link href="/login" className={linkCls('/login')}>Sign in</Link>
                <Link href="/signup" className="text-sm font-semibold text-white bg-brand px-4 py-1.5 rounded-lg hover:bg-brand-dark transition">List your practice</Link>
              </>
            )
          }
        </div>
      </div>
    </nav>
  )
}
