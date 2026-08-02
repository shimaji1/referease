// Single source of truth for provider badges.
// VerifiedPill: R+checkmark icon + "Verified" label — shown in metadata row at bottom.
// FeaturedTag: yellow tag, positioned absolutely at top-right of card.

export function VerifiedPill({ dark = false }) {
  if (dark) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-white/20 border border-white/25 px-2 py-0.5 rounded-full">
        <img src="/img/icon.png" alt="" className="w-4 h-4 rounded" />Verified
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
    <span className="absolute top-3 right-3 text-[9px] font-bold text-amber-900 bg-amber-300 border border-amber-400 px-1.5 py-0.5 rounded-full z-10 tracking-wide">
      FEATURED
    </span>
  )
}
