'use client'
import Link from 'next/link'

// Single source of truth for the ReferEasy brand mark.
// public/img/logo.png already combines the icon (navy square + R + checkmark)
// and the "ReferEasy" wordmark into one image — render it as-is, never pair
// it with a separate icon image or the mark doubles up.
const HEIGHTS = { sm: 'h-10', md: 'h-12', lg: 'h-16' }

export default function Logo({ size = 'sm', href = '/', className = '' }) {
  const heightClass = HEIGHTS[size] || HEIGHTS.sm
  const img = <img src="/img/logo.png" alt="ReferEasy" className={`${heightClass} w-auto`} />
  if (!href) return <span className={`inline-flex items-center ${className}`}>{img}</span>
  return <Link href={href} className={`inline-flex items-center ${className}`}>{img}</Link>
}
