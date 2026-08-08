import Link from 'next/link'
import TopNav from '@/components/TopNav'
import { fetchSettingServer } from '@/lib/siteSettings'

export const metadata = {
  title: 'Support & FAQ — ReferEasy',
  description: 'How to create an account, claim your listing, verify your practice, and add staff on ReferEasy.',
}

export const dynamic = 'force-dynamic'

const Section = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-20 py-8 border-b border-gray-100 last:border-0">
    <h2 className="text-xl font-bold text-gray-900 mb-3">{title}</h2>
    <div className="text-sm text-gray-600 leading-relaxed space-y-3">{children}</div>
  </section>
)

const Step = ({ n, children }) => (
  <div className="flex gap-3">
    <span className="shrink-0 w-6 h-6 rounded-full bg-brand/10 text-brand text-xs font-bold flex items-center justify-center">{n}</span>
    <p>{children}</p>
  </div>
)

export default async function SupportPage() {
  const general = await fetchSettingServer('general')
  const supportEmail = general?.support_email || 'info.refereasy@gmail.com'

  const toc = [
    ['account', 'Creating an account'],
    ['claim', 'Claiming your listing'],
    ['new-listing', 'Adding a listing that isn\'t in our directory'],
    ['verification', 'How verification works'],
    ['staff', 'Adding admins & staff'],
    ['billing', 'Plans & billing'],
    ['contact', 'Still need help?'],
  ]

  return (
    <div className="min-h-screen bg-white">
      <TopNav />
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-3">Support</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">How can we help?</h1>
        <p className="text-gray-600 mb-8">Answers to the most common questions about accounts, claiming a listing, verification, and staff access.</p>

        <nav className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap gap-x-5 gap-y-1.5">
          {toc.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="text-xs font-semibold text-brand hover:underline">{label}</a>
          ))}
        </nav>

        <Section id="account" title="Creating an account">
          <Step n={1}>Go to <Link href="/signup" className="text-brand font-semibold hover:underline">Sign Up</Link> and choose an account type: <strong>User</strong> if you're a physician searching for someone to refer to, or <strong>Provider</strong> if you're listing a practice, clinic, or specialist.</Step>
          <Step n={2}>Fill in your name, email, and password, then agree to the Terms and Privacy Policy.</Step>
          <Step n={3}>That's it — you're in. Providers land on the dashboard and can claim an existing listing or create a new one.</Step>
          <p>Changed your mind later? You can switch between a User and Provider account anytime from <strong>Settings → Account Information → Account Type</strong>. Switching away from Provider unclaims any listing(s) you manage — they stay live in the directory, just without an owner, and anyone can claim them again.</p>
        </Section>

        <Section id="claim" title="Claiming your listing">
          <p>Most Ontario practices are already in our directory, just not yet claimed by their owner. To claim yours:</p>
          <Step n={1}>From your dashboard, go to <strong>Claim Your Listing</strong> and search by practice name, phone, fax number, or practitioner number.</Step>
          <Step n={2}>Find your listing and click <strong>Claim &amp; Verify</strong>.</Step>
          <Step n={3}>
            <strong>Fax verification</strong> — we fax a 6-digit code to the fax number already on file for the listing, so it actually proves something. If that number is stale, you can provide a corrected one instead, or tell us you don't have a fax line at all to skip this step.
          </Step>
          <Step n={4}><strong>Email verification</strong> — we email a 6-digit code to confirm your contact address.</Step>
          <Step n={5}><strong>CPSO profile link</strong> (optional, individual physicians only, not clinics or facilities) — paste a link to your CPSO profile so our team can confirm your license in one click. You can skip this too; we'll look you up ourselves or follow up if we can't find you.</Step>
          <p><strong>Every claim is reviewed by our team before access is granted</strong> — usually within 1–2 business days. Nothing is auto-approved, even if the fax, email, and CPSO evidence all line up cleanly; a person looks at it first. If anything's missing or unclear, we'll email you asking for it — just reply directly. You'll get a final decision either way.</p>
        </Section>

        <Section id="new-listing" title="Adding a listing that isn't in our directory">
          <p>If your search comes up empty, click <strong>Create New Listing Instead</strong> from the claim page. Fill in your practice details and submit — new listings start on the free Listed plan and are visible in search right away, upgrade to Verified or Featured anytime from Pricing. Upgrading to Verified or Featured routes you through the same verification steps above, since the ✓ Verified badge only means something if it's actually earned, trial or not.</p>
        </Section>

        <Section id="verification" title="How verification works">
          <p>Verification is about confirming you're really the person you say you are before we hand over control of a public listing. A few things worth knowing:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>A real person on our team reviews every claim — nothing is automatic.</li>
            <li>If something's unclear or missing, we'll email you asking for it, or in some cases just call the practice directly to confirm.</li>
            <li>For individual physicians, a link to your public CPSO profile is the quickest way to confirm your license. Clinics and facilities aren't asked for one — they don't have CPSO numbers.</li>
          </ul>
        </Section>

        <Section id="staff" title="Adding admins & staff">
          <p>Providers on a paid plan can give teammates their own login to help manage a listing, without sharing a password.</p>
          <Step n={1}>Go to <strong>Settings → Staff &amp; Team</strong>.</Step>
          <Step n={2}>Enter a teammate's email and click Invite. They'll get an email with a link.</Step>
          <Step n={3}>They create their own account through that link and get access to manage the listing, no separate approval needed.</Step>
          <p>You can revoke a staff member's access at any time from the same screen. How many staff accounts you can add depends on your plan, see <Link href="/pricing" className="text-brand font-semibold hover:underline">Pricing</Link> for limits.</p>
        </Section>

        <Section id="billing" title="Plans & billing">
          <p>Verified and Featured plans start with a 60-day free trial, no card required. Add a payment method anytime from <strong>Settings → Billing</strong> to keep the plan after the trial, you won't be charged until the trial actually ends. Manage your card, view your subscription status, and see payment history from the same place.</p>
        </Section>

        <Section id="contact" title="Still need help?">
          <p>Email us at <a href={`mailto:${supportEmail}`} className="text-brand font-semibold hover:underline">{supportEmail}</a> and we'll get back to you.</p>
        </Section>
      </section>
    </div>
  )
}
