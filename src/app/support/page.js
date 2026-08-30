import Link from 'next/link'
import TopNav from '@/components/TopNav'
import { fetchSettingServer } from '@/lib/siteSettings'

export const metadata = {
  title: 'Support & Listing Guide — ReferEasy',
  description: 'How to create an account, claim your listing, build a complete provider profile, and get the most accurate referrals on ReferEasy.',
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

const GroupLabel = ({ children }) => (
  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-400 mt-6 mb-1 first:mt-0">{children}</p>
)

export default async function SupportPage() {
  const general = await fetchSettingServer('general')
  const supportEmail = general?.support_email || 'info.refereasy@gmail.com'

  return (
    <div className="min-h-screen bg-white">
      <TopNav />
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-3">Support</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">How can we help?</h1>
        <p className="text-gray-600 mb-8">Answers for anyone searching for a provider to refer to, and a full guide for providers on getting a listing that actually helps you receive the right referrals.</p>

        <nav className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
          <GroupLabel>Everyone</GroupLabel>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            <a href="#account" className="text-xs font-semibold text-brand hover:underline">Creating an account</a>
            <a href="#contact" className="text-xs font-semibold text-brand hover:underline">Still need help?</a>
          </div>
          <GroupLabel>For referring physicians</GroupLabel>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            <a href="#finding" className="text-xs font-semibold text-brand hover:underline">Finding &amp; saving providers</a>
          </div>
          <GroupLabel>For providers</GroupLabel>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            <a href="#claim" className="text-xs font-semibold text-brand hover:underline">Claiming your listing</a>
            <a href="#new-listing" className="text-xs font-semibold text-brand hover:underline">Adding a new listing</a>
            <a href="#great-listing" className="text-xs font-semibold text-brand hover:underline">Building an effective listing</a>
            <a href="#adding-doctors" className="text-xs font-semibold text-brand hover:underline">Adding doctors under your clinic</a>
            <a href="#verification" className="text-xs font-semibold text-brand hover:underline">How verification works</a>
            <a href="#staff" className="text-xs font-semibold text-brand hover:underline">Adding admins &amp; staff</a>
            <a href="#billing" className="text-xs font-semibold text-brand hover:underline">Plans &amp; billing</a>
          </div>
        </nav>

        <Section id="account" title="Creating an account">
          <Step n={1}>Go to <Link href="/signup" className="text-brand font-semibold hover:underline">Sign Up</Link> and choose an account type: <strong>User</strong> if you're a physician searching for someone to refer to, or <strong>Provider</strong> if you're listing a practice, clinic, or specialist.</Step>
          <Step n={2}>Fill in your name, email, and password, then agree to the Terms and Privacy Policy.</Step>
          <Step n={3}>That's it — you're in. Providers land on the dashboard and can claim an existing listing or create a new one.</Step>
          <p>Changed your mind later? You can switch between a User and Provider account anytime from <strong>Settings → Account Information → Account Type</strong>. Switching away from Provider unclaims any listing(s) you manage — they stay live in the directory, just without an owner, and anyone can claim them again.</p>
        </Section>

        <Section id="finding" title="Finding & saving providers">
          <p>Search by specialty, name, service, or location on <Link href="/search" className="text-brand font-semibold hover:underline">Find Care</Link>. Every result shows live accepting-referrals status, current wait time, and referral requirements set by the provider, not a static listing that might be a year out of date.</p>
          <p>Signed in, you can save providers to a personal list, useful for building a go-to roster of specialists you refer to often, so you're not re-searching every time. Look for the star icon on any listing or its full profile page.</p>
        </Section>

        <Section id="claim" title="Claiming your listing">
          <p>Most Ontario practices are already in our directory, just not yet claimed by their owner. To claim yours:</p>
          <Step n={1}>From your dashboard, go to <strong>Claim Your Listing</strong> and search by practice name, phone, fax number, or practitioner number.</Step>
          <Step n={2}>Find your listing and click <strong>Claim &amp; Verify</strong>.</Step>
          <Step n={3}><strong>Email verification</strong> — we email a 6-digit code to confirm your contact address.</Step>
          <Step n={4}><strong>CPSO profile link</strong> (optional, individual physicians only, not clinics or facilities) — paste a link to your CPSO profile so our team can confirm your license in one click. You can skip this too; we'll look you up ourselves or follow up if we can't find you.</Step>
          <p><strong>Every claim is reviewed by our team before access is granted</strong> — usually within 1–2 business days. Nothing is auto-approved, even if the email and CPSO evidence all line up cleanly; a person looks at it first. If anything's missing or unclear, we'll email you asking for it — just reply directly. You'll get a final decision either way.</p>
          <p className="bg-brand/5 border border-brand/10 rounded-lg px-4 py-3">Not sure your practice is listed yet? <Link href="/search" className="text-brand font-semibold hover:underline">Search first</Link> before creating a new one, most Ontario practices already have an unclaimed entry, and creating a duplicate just splits your referrals across two listings.</p>
        </Section>

        <Section id="new-listing" title="Adding a listing that isn't in our directory">
          <p>If your search comes up empty, click <strong>Create New Listing Instead</strong> from the claim page. Fill in your practice details and submit — new listings start on the free Listed plan and are visible in search right away, upgrade to Verified or Featured anytime from Pricing. Upgrading to Verified or Featured routes you through the same verification steps above, since the ✓ Verified badge only means something if it's actually earned, trial or not.</p>
        </Section>

        <Section id="great-listing" title="Building a listing that gets you the right referrals">
          <p>A referring physician decides whether to send you a patient based entirely on what your listing tells them. The more complete it is, the more accurate the referrals you receive, and the fewer you have to reject for missing information. A few minutes filling this in saves both sides a lot of back-and-forth later:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Referral criteria</strong> — who you accept (age range, condition, geography). This is what stops a referral you'd have to reject anyway from being sent in the first place.</li>
            <li><strong>Requirements</strong> — what a referring physician needs to include (recent imaging, a specific form, OHIP details). Spelled out up front, not discovered after a rejected fax.</li>
            <li><strong>Referral types</strong> — consultation, procedure, follow-up, whatever applies, so you show up in the right searches.</li>
            <li><strong>Services</strong> — the specific things you do (e.g. "Echocardiogram, Stress Test, Holter Monitor"), not just your specialty name.</li>
            <li><strong>Wait time</strong> — set this per listing, and it now supports <strong>same-day, 24, 48, or 72 hours</strong> as well as a number of weeks, so imaging and lab turnaround isn't forced into a "weeks" number that undersells how fast you actually are.</li>
          </ul>
          <p><strong>Work out of more than one location?</strong> Link each one from your listing's location search, and if the wait differs by site, set it per location instead of one number covering everywhere you work — a location you're only at one day a week might have a longer wait than your main clinic, and now that's visible instead of averaged away.</p>
          <p><strong>Upload your requisition or referral forms</strong> from your listing's Forms section (plan-dependent limits, see <Link href="/pricing" className="text-brand font-semibold hover:underline">Pricing</Link>). A referring physician who can download your exact form and fill it in correctly the first time is far less likely to send you an incomplete referral.</p>
        </Section>

        <Section id="adding-doctors" title="Adding doctors under your clinic">
          <p>When you list a clinic, you can add the doctors who work there directly from the form, one important thing to know: <strong>this creates a profile for them in the directory, it does not create a login or account.</strong> They can't sign in, edit their own info, or see anything until they separately sign up and claim that profile themselves.</p>
          <p>Because of that, it's worth actively encouraging your doctors to claim their own listing once you've added them, they get their own login to keep their information current, and a claimed, verified profile is more trusted by referring physicians than an unclaimed one you're managing on their behalf.</p>
          <p><strong>Before adding a new doctor, search for them first.</strong> The "search existing doctors to link" box checks whether they're already in our directory, at another location, before you create a duplicate entry. A doctor listed twice under two different clinics splits their referral history and confuses anyone searching for them.</p>
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
