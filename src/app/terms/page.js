import TopNav from '@/components/TopNav'

export const metadata = {
  title: 'Terms of Service',
  description: 'The terms that govern your use of ReferEasy.',
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

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <TopNav />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand mb-4">Legal</p>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: {updated}</p>

        <Section title="1. Acceptance of these terms">
          <p>By creating an account, claiming or managing a listing, or otherwise using refereasy.ca ("the Service"), you agree to these Terms of Service and our <a href="/privacy" className="text-brand font-medium hover:underline">Privacy Policy</a>. If you don't agree, please don't use the Service.</p>
        </Section>

        <Section title="2. What ReferEasy is — and isn't">
          <p>ReferEasy is a directory that helps referring physicians find specialists, imaging centres, and clinics in Ontario, and lets those providers manage and update their own listing information (availability, wait times, referral criteria, and forms).</p>
          <p><strong>ReferEasy is not a medical service, and listing information is not a guarantee.</strong> Wait times, accepting-referral status, and other listing details are set by each provider and may change without notice. Always confirm directly with a provider before relying on any information shown here for a clinical decision. ReferEasy does not practice medicine, provide medical advice, or take responsibility for the accuracy of provider-submitted content.</p>
        </Section>

        <Section title="3. Accounts">
          <p>You must provide accurate information when creating an account and keep your login credentials confidential. You're responsible for activity that happens under your account. Provider accounts must be created by someone authorized to manage that practice's listing; staff accounts inherit access only to the listing(s) they've been invited to.</p>
        </Section>

        <Section title="4. Acceptable use">
          <p>You agree not to: submit false or misleading listing information; use the Service to harvest data about patients or physicians for unrelated purposes; attempt to interfere with or disrupt the Service; or use automated tools to scrape the directory at scale without our written permission.</p>
        </Section>

        <Section title="5. Provider listings and content">
          <p>Providers are responsible for the accuracy of the information and documents (including referral forms) they upload. ReferEasy may review, edit, decline, or remove listing content — including provider-submitted homepage announcements or blog contributions — at our discretion, including for accuracy, quality, or policy reasons.</p>
        </Section>

        <Section title="6. Plans, trials, and billing">
          <p>ReferEasy offers Listed (free), Verified, and Featured plan tiers. Paid tiers may be offered with a free trial period; unless you keep the plan active, it automatically returns to the free Listed tier at the end of the trial, with your data and listing preserved. Where paid billing is enabled, additional billing terms will be presented at the time of purchase.</p>
        </Section>

        <Section title="7. Intellectual property">
          <p>The ReferEasy name, logo, and site design are owned by ReferEasy. Provider listing content remains owned by the provider who submitted it; by submitting it, you grant ReferEasy a license to display it on the Service.</p>
        </Section>

        <Section title="8. Disclaimers">
          <p>The Service is provided "as is" without warranties of any kind, express or implied. We don't warrant that the Service will be uninterrupted, error-free, or that listing information is complete, current, or accurate.</p>
        </Section>

        <Section title="9. Limitation of liability">
          <p>To the maximum extent permitted by law, ReferEasy is not liable for any indirect, incidental, or consequential damages arising from your use of the Service, including reliance on listing information that turns out to be outdated or inaccurate.</p>
        </Section>

        <Section title="10. Termination">
          <p>You may stop using the Service and request account deletion at any time by contacting us. We may suspend or terminate accounts that violate these terms.</p>
        </Section>

        <Section title="11. Governing law">
          <p>These terms are governed by the laws of the Province of Ontario and the federal laws of Canada applicable therein.</p>
        </Section>

        <Section title="12. Changes to these terms">
          <p>We may update these terms from time to time; continued use of the Service after changes take effect means you accept the updated terms.</p>
        </Section>

        <Section title="13. Contact us">
          <p>Questions about these terms? Email <a href="mailto:info.refereasy@gmail.com" className="text-brand font-medium hover:underline">info.refereasy@gmail.com</a>.</p>
        </Section>
      </div>
    </div>
  )
}
