'use client'
import Link from 'next/link'
import ProfileHeader from './ProfileHeader'
import { trackEvent } from '@/lib/analytics'
import { waitLabel } from '@/lib/waitTime'

// ============================================================================
// ONE profile body for every category — clinics, doctors, imaging, labs.
// Both the search detail and the doctor page render THIS component, so fonts,
// sizes, spacing and layout are identical by construction.
// Cards render only when they have data.
//
// Layout: header banner full-width, then two columns on desktop (stacked on
// mobile) — left is the main content (specialty, notes, services, referral
// info, forms, linked physicians), right is location(s) + hours.
// ============================================================================

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function Card({ title, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <h4 className="text-xs font-bold uppercase tracking-wider text-brand/60 mb-3">{title}</h4>
      {children}
    </div>
  )
}

export function Row({ l, v, href, onClick }) {
  const val = href
    ? <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} className="text-brand font-semibold text-right break-words hover:underline">{v}</a>
    : <span className="text-gray-900 font-medium text-right break-words">{v}</span>
  return <div className="flex justify-between py-1.5 text-sm gap-2 border-b border-gray-50 last:border-0"><span className="text-gray-400 shrink-0">{l}</span>{val}</div>
}

function HoursRows({ hours }) {
  const todayName = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()]
  return DAY_KEYS.map((d, i) => {
    const isToday = d === todayName
    return (
      <div key={d} className={`flex justify-between py-1.5 text-sm gap-2 border-b border-gray-50 last:border-0 ${isToday ? 'font-bold' : ''}`}>
        <span className={isToday ? 'text-brand' : 'text-gray-400'}>{DAY_NAMES[i]}{isToday ? ' · Today' : ''}</span>
        <span className={hours?.[d] ? 'text-gray-900 font-medium' : 'text-gray-300'}>{hours?.[d] || 'Closed'}</span>
      </div>
    )
  })
}

export default function ProfileView({
  providerId = null,                // for click tracking (Featured's analytics dashboard)
  name, subtitle, verified, verifiedAt, action, tiles = [], headerFooter = null,
  banner = null,                    // e.g. claim banner — renders under the header
  languages = null,                 // top-level languages fallback (used for the Location card)
  specialty = null,                 // main specialty label
  subSpecialty = null,              // sub-specialty label
  contact = null,                   // { address, phone, fax, email, website, languages }
  hours = null,                     // { mon..sun }
  referral = null,                  // { wait, requirements, criteria, types[], cpso_number, cpso_url }
  howToRefer = null,                // string/node
  people = null,                    // [{ id, name, detail, href }] — linked doctors, clinics only
  notes = null,                     // free-text notes from the provider
  locations = null,                 // [{ id, name, address, phone, fax, website, hours }]
  forms = null,                     // [{ id, name, url }]
  services = null,                  // [string]
}) {
  const c = contact || {}
  const hasContact = c.address || c.phone || c.fax || c.email || c.website || (c.languages && c.languages.length)
  const hasHours = hours && Object.values(hours).some(v => v)
  const r = referral || {}
  const hasReferral = r.wait !== undefined || r.requirements || r.criteria || (r.types && r.types.length) || r.cpso_number || r.cpso_url
  const hasSpecialty = specialty || subSpecialty

  return (
    <div className="animate-fade-in">
      <ProfileHeader name={name} subtitle={subtitle} verified={verified} verifiedAt={verifiedAt} action={action} tiles={tiles} footer={headerFooter} />

      {banner}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-3 items-start">
        {/* Left column — main content */}
        <div className="flex flex-col gap-3">
          {hasSpecialty && (
            <Card title="Specialty">
              {specialty && <Row l="Specialty" v={specialty} />}
              {subSpecialty && <Row l="Sub-specialty" v={subSpecialty} />}
            </Card>
          )}

          {notes && <Card title="Notes from this provider"><p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{notes}</p></Card>}

          {services && services.length > 0 && (
            <Card title="Services">
              <div className="flex flex-wrap gap-1.5">{services.map(sv => <span key={sv} className="text-xs text-brand bg-brand/5 border border-brand/10 px-2.5 py-1 rounded-md">{sv}</span>)}</div>
            </Card>
          )}

          {hasReferral && (
            <Card title="Referral Info">
              {r.types && r.types.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {r.types.map(t => <span key={t} className="text-xs text-brand bg-brand/5 border border-brand/10 px-2.5 py-1 rounded-md">{t}</span>)}
                </div>
              )}
              {r.wait !== undefined && <Row l="Wait" v={r.wait} />}
              {r.criteria && <Row l="Criteria" v={r.criteria} />}
              {r.requirements && <Row l="Requirements" v={r.requirements} />}
              {r.cpso_number && <Row l="CPSO #" v={r.cpso_number} />}
              {r.cpso_url && <Row l="CPSO" v="View CPSO profile →" href={r.cpso_url} />}
            </Card>
          )}

          {howToRefer && <Card title="How to Refer"><p className="text-sm text-gray-700 leading-relaxed">{howToRefer}</p></Card>}

          {forms && forms.length > 0 && (
            <Card title="Forms">
              {forms.map(f => (
                <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer" onClick={() => trackEvent(providerId, 'form_download')} className="flex items-center justify-between py-2 text-sm border-b border-gray-50 last:border-0 group">
                  <span className="text-gray-900 group-hover:text-brand font-medium">📄 {f.name}</span>
                  <span className="text-brand font-semibold group-hover:underline shrink-0">Download</span>
                </a>
              ))}
            </Card>
          )}

          {people && people.length > 0 && (
            <Card title="Physicians">
              {people.map(d => (
                <Link key={d.id} href={d.href} className="flex items-center justify-between py-2 text-sm border-b border-gray-50 last:border-0 group">
                  <span className="text-gray-900 group-hover:text-brand font-semibold">{d.name}{d.detail ? ` — ${d.detail}` : ''}</span>
                  <span className="text-gray-300 group-hover:text-brand">→</span>
                </Link>
              ))}
            </Card>
          )}
        </div>

        {/* Right column — location(s) + hours */}
        <div className="flex flex-col gap-3">
          {hasContact && (
            <Card title="Contact & Location">
              {c.address && <Row l="Address" v={c.address} href={`https://maps.google.com/?q=${encodeURIComponent(c.address)}`} onClick={() => trackEvent(providerId, 'click_address')} />}
              {c.phone && <Row l="Phone" v={c.phone} href={`tel:${c.phone}`} onClick={() => trackEvent(providerId, 'click_phone')} />}
              {c.fax && <Row l="Fax" v={c.fax} onClick={() => trackEvent(providerId, 'click_fax')} />}
              {c.email && <Row l="Email" v={c.email} href={`mailto:${c.email}`} onClick={() => trackEvent(providerId, 'click_email')} />}
              {c.website && <Row l="Website" v={String(c.website).replace(/^https?:\/\//, '')} href={String(c.website).startsWith('http') ? c.website : `https://${c.website}`} onClick={() => trackEvent(providerId, 'click_website')} />}
              {c.languages && c.languages.length > 0 && <Row l="Languages" v={c.languages.join(', ')} />}
            </Card>
          )}

          {locations && locations.length > 0 && (
            <Card title={locations.length > 1 ? 'Locations' : 'Location'}>
              {locations.map((loc, i) => (
                <div key={loc.id || i} className={i > 0 ? 'pt-3 mt-3 border-t border-gray-100' : ''}>
                  <div className="flex items-center justify-between gap-2">
                    {loc.id ? (
                      <Link href={`/search?id=${loc.id}`} className="text-sm font-semibold text-brand hover:underline">{loc.name}</Link>
                    ) : (
                      <span className="text-sm font-semibold text-gray-900">{loc.name}</span>
                    )}
                    {i === 0 && locations.length > 1 && <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full shrink-0">Main clinic</span>}
                  </div>
                  {loc.address && <Row l="Address" v={loc.address} href={`https://maps.google.com/?q=${encodeURIComponent(loc.address)}`} />}
                  {loc.phone && <Row l="Phone" v={loc.phone} href={`tel:${loc.phone}`} />}
                  {loc.fax && <Row l="Fax" v={loc.fax} />}
                  {loc.wait_type && <Row l="Wait here" v={waitLabel(loc.wait_type, loc.wait_weeks)} />}
                  {loc.website && <Row l="Website" v={String(loc.website).replace(/^https?:\/\//, '')} href={String(loc.website).startsWith('http') ? loc.website : `https://${loc.website}`} />}
                  {(loc.languages || (i === 0 && languages)) && <Row l="Languages" v={(loc.languages || languages).join(', ')} />}
                </div>
              ))}
            </Card>
          )}

          {hasHours && <Card title="Hours"><HoursRows hours={hours} /></Card>}
        </div>
      </div>
    </div>
  )
}
