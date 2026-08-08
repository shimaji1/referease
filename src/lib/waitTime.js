// Single source of truth for wait-time representation. A wait is either one of a
// few fixed fast presets (same-day imaging/lab turnaround) or a number of weeks
// (typical specialist wait) — forcing everything into "weeks" made same-day and
// 24/48/72-hour turnaround indistinguishable from "varies."

export const WAIT_TYPES = [
  { value: 'same_day', label: 'Same day' },
  { value: '24h', label: '24 hours' },
  { value: '48h', label: '48 hours' },
  { value: '72h', label: '72 hours' },
  { value: 'weeks', label: 'Number of weeks' },
]

export function waitLabel(type, weeks) {
  switch (type) {
    case 'same_day': return 'Same day'
    case '24h': return '24 hours'
    case '48h': return '48 hours'
    case '72h': return '72 hours'
    case 'weeks':
      if (weeks == null) return 'Varies'
      return weeks === 0 ? 'No wait' : `~${weeks} week${weeks > 1 ? 's' : ''}`
    default:
      return 'Varies'
  }
}

// Approximate days, used for sorting/filtering/color so fast presets and
// week-based waits can be compared on one scale. 9999 = unknown/varies, always sorts last.
export function waitDaysApprox(type, weeks) {
  switch (type) {
    case 'same_day': return 0
    case '24h': return 1
    case '48h': return 2
    case '72h': return 3
    case 'weeks': return weeks == null ? 9999 : weeks * 7
    default: return 9999
  }
}

export function waitColor(type, weeks) {
  const days = waitDaysApprox(type, weeks)
  if (days >= 9999) return null
  if (days <= 28) return 'text-emerald-600'
  if (days <= 84) return 'text-amber-500'
  return 'text-red-500'
}

// Short badge text, e.g. for compact cards ("Same day", "~3 wk")
export function waitShort(type, weeks) {
  switch (type) {
    case 'same_day': return 'Same day'
    case '24h': return '24h'
    case '48h': return '48h'
    case '72h': return '72h'
    case 'weeks':
      if (weeks == null) return 'Varies'
      return weeks === 0 ? 'No wait' : `~${weeks} wk`
    default:
      return 'Varies'
  }
}
