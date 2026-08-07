import TopNav from '@/components/TopNav'

export const metadata = {
  title: 'Privacy Policy',
  description: 'How ReferEasy collects, uses, and protects your information.',
}

const updated = 'August 7, 2026'

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-3">{title}</h2>
      <div className="text-gray-600 leading-relaxed space-y-3">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <TopNav />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-4">Legal</p>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: {updated}</p>

        <Section title="1. Who we are">
          <p>ReferEasy ("ReferEasy," "we," "us," or "our") operates refereasy.ca, an online directory that helps referring physicians in Ontario find specialists, imaging centres, and clinics accepting referrals. This policy explains what information we collect, how we use it, and the choices you have.</p>
        </Section>

        <Section title="2. Information we collect">
          <p><strong>Account information.</strong> If you create an account, we collect your name, email address, and, for provider accounts, information about your practice (clinic name, CPSO number, phone, address, and similar listing details).</p>
          <p><strong>Provider listing content.</strong> Providers who claim or manage a listing may upload referral forms, wait times, accepting-referral status, and related practice information, which is displayed publicly on the directory.</p>
          <p><strong>Usage and analytics data.</strong> When you browse the site, we automatically collect: pages visited, search terms and filters used, links clicked, referring website, device type, browser, and approximate session behaviour. We assign a randomly generated visitor identifier (stored in your browser) so we can distinguish separate visits — this identifier is not tied to your name or email unless you also create an account.</p>
          <p><strong>Cookies and local storage.</strong> We use first-party cookies and browser local storage to keep you signed in, remember your preferences, and power the usage analytics described above. See Section 5.</p>
        </Section>

        <Section title="3. How we use information">
          <p>We use the information above to: operate and improve the directory; let physicians manage their listings; process account creation and plan upgrades; send you service-related email (and, only with your separate consent, marketing email); and understand aggregate site usage and search demand (for example, which specialties are most searched in which regions) so we can improve the product and, where relevant, share aggregated, de-identified insights with healthcare organizations or advertisers.</p>
          <p><strong>We do not sell your individually identifiable browsing or search history to third parties.</strong> Where we share data with outside organizations for research, market insight, or advertising purposes, it is aggregated and de-identified — it is not tied back to an individual visitor without their explicit, separate consent.</p>
        </Section>

        <Section title="4. How we share information">
          <p>We share information with the service providers that run the platform on our behalf, including our hosting provider (Vercel), database provider (Supabase), and transactional email provider (Resend). These providers are bound to use your information only to provide their service to us.</p>
          <p>We may disclose information if required by law, or to protect the rights, safety, or property of ReferEasy, our users, or the public.</p>
        </Section>

        <Section title="5. Cookies">
          <p><strong>Necessary cookies</strong> keep you logged in and remember basic preferences — the site won't function properly without these.</p>
          <p><strong>Analytics cookies</strong> (a visitor ID and a session ID) let us measure traffic and understand how the directory is used. These are first-party only; we do not currently use third-party advertising or tracking cookies. If that changes, we'll update this policy and, where required, ask for your consent first.</p>
          <p>You can block or delete cookies through your browser settings at any time; doing so may affect parts of the site that rely on staying signed in.</p>
        </Section>

        <Section title="6. Data retention">
          <p>We retain account and listing information for as long as your account is active, and usage analytics for a reasonable period to support trend analysis. You can request deletion of your account and associated personal information at any time (Section 7).</p>
        </Section>

        <Section title="7. Your rights">
          <p>Under Canadian privacy law (PIPEDA), you can request access to, correction of, or deletion of your personal information, and you can withdraw consent for optional uses (like marketing email) at any time. To make a request, email us at <a href="mailto:info.refereasy@gmail.com" className="text-brand font-medium hover:underline">info.refereasy@gmail.com</a>.</p>
        </Section>

        <Section title="8. Children's privacy">
          <p>ReferEasy is intended for use by healthcare professionals and adults searching for care on behalf of themselves or others. We do not knowingly collect information from children under 13.</p>
        </Section>

        <Section title="9. Changes to this policy">
          <p>We may update this policy from time to time. Material changes will be reflected by an updated "Last updated" date above, and where appropriate, we'll provide additional notice.</p>
        </Section>

        <Section title="10. Contact us">
          <p>Questions about this policy or your information? Email <a href="mailto:info.refereasy@gmail.com" className="text-brand font-medium hover:underline">info.refereasy@gmail.com</a>.</p>
        </Section>
      </div>
    </div>
  )
}
