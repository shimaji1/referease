'use client'

// One profile header for every category — clinics, doctors, imaging, labs.
// Navy banner + initials avatar + overlapping quick-stat tiles (z-fixed).
export default function ProfileHeader({ name, subtitle, verified, action, tiles = [], footer }) {
  const initials = (name || '?').replace(/^(dr\.?|the)\s+/i, '').split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase()
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 mb-4 bg-white">
      <div className="bg-gradient-to-r from-brand to-[#2c4f7c] px-6 pt-6 pb-16">
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-16 h-16 rounded-2xl bg-white/15 border border-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-xl shrink-0">{initials}</div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold text-white leading-tight">{name}</h2>
                {verified && <span className="text-[11px] font-bold text-white bg-white/20 border border-white/25 px-2.5 py-0.5 rounded-full">✓ Verified</span>}
              </div>
              {subtitle && <p className="text-sm text-white/80 font-medium mt-1">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
      </div>
      <div className="relative z-10 px-4 pb-4 -mt-10">
        <div className={`grid grid-cols-2 sm:grid-cols-${Math.min(tiles.length, 4) || 2} gap-3`} style={{ gridTemplateColumns: `repeat(${Math.min(tiles.length, 4) || 2}, minmax(0, 1fr))` }}>
          {tiles.map((t, i) => {
            const tone = t.color ? t.color : t.good === true ? 'text-emerald-600' : t.good === false ? 'text-red-500' : 'text-gray-900'
            return (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
                <div className={`text-base font-bold ${tone}`}>{t.big}</div>
                <div className="text-[11px] text-gray-400 mt-0.5 uppercase tracking-wide">{t.small}</div>
              </div>
            )
          })}
        </div>
        {footer}
      </div>
    </div>
  )
}
