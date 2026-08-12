import Link from 'next/link'
import { redirect } from 'next/navigation'
import TopNav from '@/components/TopNav'
import ProfileView from '@/components/ProfileView'
import { getSupabase } from '@/lib/supabase-server'
import { providerSlug, providerIdFromSlug, extractCity } from '@/lib/providerSeo'
import { waitLabel, waitColor } from '@/lib/waitTime'
import { can } from '@/lib/plan'

const BASE = 'https://www.refereasy.ca'
const DOCTOR_CATEGORIES = ['Specialist', 'Family Medicine']

// The one server-rendered, publicly indexable page per listing — everything on
// /search is client-rendered (fetched after hydration), which is invisible to
// crawlers that don't execute JavaScript (most AI crawlers, and Googlebot at
// scale). This page exists specifically so each of the ~4,700 real listings has
// real, citable content in its initial HTML.
async function loadProvider(id) {
  const sb = getSupabase()
  if (!sb || !id) return null
  const { data } = await sb.from('providers').select('*').eq('id', id).eq('data_status', 'complete').maybeSingle()
  return data
}

async function loadRelated(sb, p) {
  const [primaryRes, secondaryLinkRes] = await Promise.all([
    sb.from('providers').select('id, name, type, category').eq('clinic_provider_id', p.id),
    sb.from('doctor_locations').select('doctor_provider_id').eq('clinic_provider_id', p.id),
  ])
  const primary = primaryRes.data || []
  const secondaryIds = (secondaryLinkRes.data || []).map(l => l.doctor_provider_id).filter(id => !primary.some(d => d.id === id))
  let secondary = []
  if (secondaryIds.length) {
    const { data } = await sb.from('providers').select('id, name, type, category').in('id', secondaryIds)
    secondary = data || []
  }
  const docs = [...primary, ...secondary].map(d => ({ id: d.id, name: d.name, specialty: d.type || d.category }))

  const { data: formsData } = await sb.from('listing_forms').select('*').eq('provider_id', p.id)

  const primaryClinicIds = p.clinic_provider_id ? [p.clinic_provider_id] : []
  const { data: locLinks } = await sb.from('doctor_locations').select('clinic_provider_id, wait_type, wait_weeks').eq('doctor_provider_id', p.id)
  const waitByClinicId = {}
  ;(locLinks || []).forEach(l => { waitByClinicId[l.clinic_provider_id] = { wait_type: l.wait_type, wait_weeks: l.wait_weeks } })
  const secondaryClinicIds = (locLinks || []).map(l => l.clinic_provider_id).filter(id => !primaryClinicIds.includes(id))
  const allClinicIds = [...primaryClinicIds, ...secondaryClinicIds]
  let parentClinics = []
  if (allClinicIds.length) {
    const { data: clinics } = await sb.from('providers').select('id, name, address, phone, fax, website, hours').in('id', allClinicIds)
    parentClinics = allClinicIds.map(id => {
      const c = (clinics || []).find(x => x.id === id)
      return c ? { ...c, ...(waitByClinicId[id] || {}) } : null
    }).filter(Boolean)
  }

  return { docs, forms: formsData || [], parentClinics }
}

function isOpenNow(hours) {
  if (!hours) return false
  const day = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()]
  const spec = hours[day]
  if (!spec) return false
  const now = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`
  const [open, close] = spec.split('-')
  return close === '24:00' ? now >= open : now >= open && now < close
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const id = providerIdFromSlug(slug)
  const p = await loadProvider(id)
  if (!p) return { title: 'Listing not found | ReferEasy' }

  const specialty = p.type || p.category
  const city = extractCity(p.address)
  const isDoctor = DOCTOR_CATEGORIES.includes(p.category)
  const title = `${p.name}${specialty ? ` — ${specialty}` : ''}${city ? ` in ${city}, Ontario` : ' in Ontario'} | ReferEasy`

  const acceptingText = p.accepting_referrals == null ? '' : p.accepting_referrals ? 'Currently accepting referrals.' : 'Not currently accepting new referrals.'
  const waitText = p.wait_type ? `Wait time: ${waitLabel(p.wait_type, p.wait_weeks)}.` : ''
  const description = `${p.name} is a${isDoctor ? '' : ' healthcare'} ${specialty || 'healthcare provider'}${city ? ` in ${city}, Ontario` : ' in Ontario'}. ${acceptingText} ${waitText}`.replace(/\s+/g, ' ').trim()

  const canonical = `/doctors/${providerSlug(p)}`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: 'profile', title, description, url: `${BASE}${canonical}` },
    twitter: { card: 'summary', title, description },
  }
}

export default async function DoctorProfilePage({ params }) {
  const { slug } = await params
  const id = providerIdFromSlug(slug)
  const p = await loadProvider(id)

  if (!p) {
    return (
      <div className="min-h-screen bg-white">
        <TopNav />
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
          <p className="text-4xl mb-3">🔍</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Listing not found</h1>
          <p className="text-sm text-gray-500 mb-6">This listing may have been removed or merged.</p>
          <Link href="/search" className="text-sm font-semibold text-brand hover:underline">← Back to search</Link>
        </div>
      </div>
    )
  }

  // One canonical URL per listing — redirect stale/incomplete slugs to it so
  // search engines never see two URLs for the same provider.
  const canonicalSlug = providerSlug(p)
  if (slug !== canonicalSlug) redirect(`/doctors/${canonicalSlug}`)

  const sb = getSupabase()
  const { docs, forms, parentClinics } = await loadRelated(sb, p)

  const isDoctor = DOCTOR_CATEGORIES.includes(p.category)
  const specialty = p.type || p.category
  const city = extractCity(p.address)
  const open = isOpenNow(p.hours)

  const canonicalUrl = `${BASE}/doctors/${canonicalSlug}`

  // Structured data: an entity block AI/search engines can parse directly, plus an
  // FAQ block in the exact question/answer shape both Google's AI Overviews and
  // chat-based answer engines favour when deciding what to cite.
  const entityLd = {
    '@context': 'https://schema.org',
    '@type': isDoctor ? 'Physician' : 'MedicalClinic',
    name: p.name,
    url: canonicalUrl,
    medicalSpecialty: specialty || undefined,
    address: p.address || undefined,
    telephone: p.phone || undefined,
    ...(p.website ? { sameAs: p.website.startsWith('http') ? p.website : `https://${p.website}` } : {}),
  }

  const faqEntries = [
    isDoctor
      ? { q: `Is ${p.name} accepting new referrals?`, a: p.accepting_referrals == null ? `Referral status for ${p.name} is not currently listed.` : p.accepting_referrals ? `Yes, ${p.name} is currently accepting new referrals.` : `${p.name} is not currently accepting new referrals.` }
      : { q: `Is ${p.name} accepting new referrals?`, a: p.accepting_referrals == null ? `Referral status for ${p.name} is not currently listed.` : p.accepting_referrals ? `Yes, ${p.name} is currently accepting new referrals.` : `${p.name} is not currently accepting new referrals.` },
    { q: `What is the wait time to be seen at ${p.name}?`, a: !p.wait_type ? `Wait time for ${p.name} is not currently listed.` : `The current estimated wait time at ${p.name} is ${waitLabel(p.wait_type, p.wait_weeks)}.` },
    p.requirements ? { q: `What does ${p.name} require for a referral?`, a: p.requirements } : null,
    p.address ? { q: `Where is ${p.name} located?`, a: `${p.name} is located at ${p.address}.` } : null,
  ].filter(Boolean)

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqEntries.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  }

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(entityLd) }} />
      {faqEntries.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}
      <TopNav />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href={`/search?id=${p.id}`} className="text-sm text-brand font-semibold mb-4 inline-block hover:underline">← Search all providers</Link>

        <ProfileView
          providerId={p.id}
          name={p.name}
          subtitle={`${p.type}${p.category ? ` · ${p.category}` : ''}`}
          specialty={p.type}
          subSpecialty={p.sub_specialty}
          verified={p.verified && can(p, 'verified_badge')}
          verifiedAt={p.verified_at}
          tiles={[
            { big: p.accepting_referrals == null ? 'Unknown' : p.accepting_referrals ? 'Accepting' : 'Not accepting', small: 'Referrals', good: p.accepting_referrals },
            { big: waitLabel(p.wait_type, p.wait_weeks), small: 'Wait time', color: waitColor(p.wait_type, p.wait_weeks) },
            { big: open ? 'Open now' : 'Closed', small: 'Right now', good: open },
          ]}
          banner={
            p.owner_id ? null : (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-sm text-blue-900 font-medium">Is this your practice? Claim this listing to manage availability, wait times and referral details.</span>
                  <Link href={`/dashboard/verify?provider_id=${p.id}`} className="text-xs font-semibold text-white bg-brand px-4 py-2 rounded-lg hover:bg-brand-dark transition shrink-0">Claim this listing</Link>
                </div>
              </div>
            )
          }
          contact={{ address: p.address, phone: p.phone, fax: p.fax, email: p.email, website: p.website, languages: p.languages || ['English'] }}
          hours={p.hours}
          locations={parentClinics.length ? parentClinics.map(c => ({ id: c.id, name: c.name, address: c.address, phone: c.phone, fax: c.fax, website: c.website, wait_type: c.wait_type, wait_weeks: c.wait_weeks })) : null}
          referral={{ wait: waitLabel(p.wait_type, p.wait_weeks), requirements: p.requirements, criteria: p.criteria, types: p.referral_types, cpso_url: p.cpso_url }}
          notes={p.notes}
          people={docs.length > 0 ? docs.map(d => ({ id: d.id, name: d.name, detail: d.specialty, href: `/doctors/${d.id}` })) : null}
          forms={forms.map(f => ({ id: f.id, name: f.name, url: f.file_url }))}
          services={p.services}
        />

        {faqEntries.length > 0 && (
          <div className="mt-8 bg-gray-50 border border-gray-200 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Frequently asked</h2>
            <div className="space-y-4">
              {faqEntries.map((f, i) => (
                <div key={i}>
                  <p className="text-sm font-semibold text-gray-800">{f.q}</p>
                  <p className="text-sm text-gray-600 mt-1">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
