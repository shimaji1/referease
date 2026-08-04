'use client'
import { checkPassword, PASSWORD_HINT } from '@/lib/password'

const STRENGTH_STYLE = {
  weak: { bars: 1, color: 'bg-red-500', label: 'Weak', text: 'text-red-600' },
  good: { bars: 2, color: 'bg-amber-500', label: 'Good', text: 'text-amber-600' },
  strong: { bars: 3, color: 'bg-emerald-500', label: 'Strong', text: 'text-emerald-600' },
}

// Live strength meter + requirement checklist shown under a password input.
export default function PasswordStrengthMeter({ password }) {
  if (!password) return <p className="text-[11px] text-gray-400 mt-1.5">{PASSWORD_HINT}</p>
  const c = checkPassword(password)
  const s = STRENGTH_STYLE[c.strength]

  const req = (ok, label) => (
    <span className={`inline-flex items-center gap-1 ${ok ? 'text-emerald-600' : 'text-gray-400'}`}>
      {ok ? '✓' : '·'} {label}
    </span>
  )

  return (
    <div className="mt-1.5">
      <div className="flex gap-1 mb-1.5">
        {[0, 1, 2].map(i => <div key={i} className={`h-1 flex-1 rounded-full ${i < s.bars ? s.color : 'bg-gray-200'}`} />)}
      </div>
      <div className="flex items-center justify-between flex-wrap gap-x-3 gap-y-1 text-[11px]">
        <span className={`font-semibold ${s.text}`}>{s.label}</span>
        <div className="flex gap-2 flex-wrap">
          {req(c.hasMinLen, '8+ chars')}
          {req(c.hasUpper, 'Capital')}
          {req(c.hasNumber, 'Number')}
          {req(c.hasSymbol, 'Symbol')}
        </div>
      </div>
    </div>
  )
}
