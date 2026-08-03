'use client'
import Link from 'next/link'

// Single source of truth for the ReferEasy brand mark.
// Two sizes: 'sm' for nav bars/footers (h-7-8 icon), 'md' for hero/big usage.
// The icon comes from public/img/icon.png (navy square + R + checkmark).
// The wordmark comes from public/img/refereasy_logo.png.
export default function Logo({ size = 'sm', href = '/', className = '' }) {
  const iconClass = size === 'lg' ? 'h-12 w-12' : size === 'md' ? 'h-10 w-10' : 'h-8 w-8'
  const wordClass = size === 'lg' ? 'h-9' : size === 'md' ? 'h-7' : 'h-6'
  const inner = (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <img src="/img/icon.png" alt="ReferEasy" className={`${iconClass} rounded-lg`} />
      <img src="/img/refereasy_logo.png" alt="ReferEasy" className={`${wordClass} w-auto`} />
    </span>
  )
  if (!href) return inner
  return <Link href={href} className="inline-flex items-center">{inner}</Link>
}
