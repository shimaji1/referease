// The one place plan logic lives. Called from every gated feature so we never
// have to duplicate this reasoning.
//
// A provider's *effective* plan is:
//   - Their assigned `plan` (listed/verified/featured), IF one of:
//     (a) plan_granted_by_admin = true (admin gave it, no expiry)
//     (b) trial_ends_at is in the future (active trial)
//   - Otherwise 'listed' (free), trial expired without conversion

export function getEffectivePlan(provider) {
  if (!provider) return 'listed'
  const plan = provider.plan || 'listed'
  if (plan === 'listed') return 'listed'

  // Admin grant = permanent (until admin changes it)
  if (provider.plan_granted_by_admin) return plan

  // Trial mode, check expiry
  if (provider.trial_ends_at) {
    const expiresAt = new Date(provider.trial_ends_at).getTime()
    if (expiresAt > Date.now()) return plan  // Trial still active
    return 'listed'                           // Trial expired → downgrade
  }

  // Plan set but no grant and no trial → conservative default
  return plan
}

export function getPlanStatus(provider) {
  const effective = getEffectivePlan(provider)
  const raw = provider?.plan || 'listed'

  if (raw === 'listed')
    return { effective, label: 'Listed', tier: 'listed', kind: 'free' }

  if (provider.plan_granted_by_admin) {
    return { effective, label: raw === 'verified' ? 'Verified · granted' : 'Featured · granted', tier: raw, kind: 'granted' }
  }

  if (provider.trial_ends_at) {
    const end = new Date(provider.trial_ends_at).getTime()
    const now = Date.now()
    const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
    if (end > now) {
      return { effective, label: `${raw === 'verified' ? 'Verified' : 'Featured'} · trial · ${daysLeft}d left`, tier: raw, kind: 'trial', daysLeft }
    }
    return { effective: 'listed', label: `${raw === 'verified' ? 'Verified' : 'Featured'} · trial expired`, tier: 'listed', kind: 'expired' }
  }

  return { effective, label: raw === 'verified' ? 'Verified' : 'Featured', tier: raw, kind: 'paid' }
}

// Trial length in days
export const TRIAL_DAYS = 60

export function trialEndDate(startDate = new Date()) {
  const d = new Date(startDate)
  d.setDate(d.getDate() + TRIAL_DAYS)
  return d
}

// Which reminder is due for a trial ending on `endDate`?
// Returns null if no reminder is due today, or one of '15d' | '7d' | '5d' | '1d'.
export function reminderDue(endDate) {
  const now = new Date()
  const end = new Date(endDate)
  const msPerDay = 1000 * 60 * 60 * 24
  const daysUntilEnd = Math.floor((end.getTime() - now.getTime()) / msPerDay)
  if (daysUntilEnd === 15) return '15d'
  if (daysUntilEnd === 7)  return '7d'
  if (daysUntilEnd === 5)  return '5d'
  if (daysUntilEnd === 1)  return '1d'
  return null
}
