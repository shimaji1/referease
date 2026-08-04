// Single source of truth for provider badges.
// VerifiedPill: R+checkmark icon + "Verified" label — shown in metadata row at bottom.
// FeaturedTag: yellow tag, positioned absolutely at top-right of card.

// icon.png is an opaque JPEG (no transparency) — on any non-white background it shows a
// visible box around the mark. logo.png is the real transparent asset, so instead of a
// separate square icon file, this crops just the icon portion out of the left edge of it.
function IconMark() {
  return (
    <span className="relative inline-block w-4 h-4 rounded overflow-hidden shrink-0 align-middle">
      <img src="/img/logo.png" alt="" className="absolute left-0 top-0 h-4 w-auto max-w-none" />
    </span>
  )
}

export function VerifiedPill({ dark = false }) {
  if (dark) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-white/20 border border-white/25 px-2 py-0.5 rounded-full">
        <IconMark />Verified
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand bg-brand/5 px-1.5 py-0.5 rounded-full border border-brand/15 shrink-0">
      <img src="/img/icon.png" alt="" className="w-4 h-4 rounded" />Verified
    </span>
  )
}

export function FeaturedTag() {
  return (
    <span className="absolute top-3 right-3 text-[9px] font-bold text-amber-800 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full z-10 tracking-wide">
      FEATURED
    </span>
  )
}
