// Fallback content shown if the DB row hasn't been created/edited yet. The admin's
// Settings → Legal editor overwrites these via site_settings (keys: legal_terms, legal_privacy).

export const DEFAULT_PRIVACY_HTML = `
<h2>1. Who we are</h2>
<p>ReferEasy ("ReferEasy," "we," "us," or "our") operates refereasy.ca, an online directory that helps referring physicians in Ontario find specialists, imaging centres, and clinics accepting referrals. This policy explains what information we collect, how we use it, and the choices you have.</p>
<h2>2. Information we collect</h2>
<p><strong>Account information.</strong> If you create an account, we collect your name, email address, and, for provider accounts, information about your practice (clinic name, CPSO number, phone, address, and similar listing details).</p>
<p><strong>Provider listing content.</strong> Providers who claim or manage a listing may upload referral forms, wait times, accepting-referral status, and related practice information, which is displayed publicly on the directory.</p>
<p><strong>Usage and analytics data.</strong> When you browse the site, we automatically collect: pages visited, search terms and filters used, links clicked, referring website, device type, browser, and approximate session behaviour. We assign a randomly generated visitor identifier (stored in your browser) so we can distinguish separate visits — this identifier is not tied to your name or email unless you also create an account.</p>
<p><strong>Cookies and local storage.</strong> We use first-party cookies and browser local storage to keep you signed in, remember your preferences, and power the usage analytics described above. See Section 5.</p>
<h2>3. How we use information</h2>
<p>We use the information above to: operate and improve the directory; let physicians manage their listings; process account creation and plan upgrades; send you service-related email (and, only with your separate consent, marketing email); and understand aggregate site usage and search demand (for example, which specialties are most searched in which regions) so we can improve the product and, where relevant, share aggregated, de-identified insights with healthcare organizations or advertisers.</p>
<p><strong>We do not sell your individually identifiable browsing or search history to third parties.</strong> Where we share data with outside organizations for research, market insight, or advertising purposes, it is aggregated and de-identified — it is not tied back to an individual visitor without their explicit, separate consent.</p>
<h2>4. How we share information</h2>
<p>We share information with the service providers that run the platform on our behalf, including our hosting provider (Vercel), database provider (Supabase), and transactional email provider (Resend). These providers are bound to use your information only to provide their service to us.</p>
<p>We may disclose information if required by law, or to protect the rights, safety, or property of ReferEasy, our users, or the public.</p>
<h2>5. Cookies</h2>
<p><strong>Necessary cookies</strong> keep you logged in and remember basic preferences — the site won't function properly without these.</p>
<p><strong>Analytics cookies</strong> (a visitor ID and a session ID) let us measure traffic and understand how the directory is used. These are first-party only; we do not currently use third-party advertising or tracking cookies. If that changes, we'll update this policy and, where required, ask for your consent first.</p>
<p>You can block or delete cookies through your browser settings at any time; doing so may affect parts of the site that rely on staying signed in.</p>
<h2>6. Data retention</h2>
<p>We retain account and listing information for as long as your account is active, and usage analytics for a reasonable period to support trend analysis. You can request deletion of your account and associated personal information at any time (Section 7).</p>
<h2>7. Your rights</h2>
<p>Under Canadian privacy law (PIPEDA), you can request access to, correction of, or deletion of your personal information, and you can withdraw consent for optional uses (like marketing email) at any time. To make a request, email us at <a href="mailto:info.refereasy@gmail.com">info.refereasy@gmail.com</a>.</p>
<h2>8. Children's privacy</h2>
<p>ReferEasy is intended for use by healthcare professionals and adults searching for care on behalf of themselves or others. We do not knowingly collect information from children under 13.</p>
<h2>9. Changes to this policy</h2>
<p>We may update this policy from time to time. Material changes will be reflected by an updated "Last updated" date above, and where appropriate, we'll provide additional notice.</p>
<h2>10. Contact us</h2>
<p>Questions about this policy or your information? Email <a href="mailto:info.refereasy@gmail.com">info.refereasy@gmail.com</a>.</p>
`.trim()

export const DEFAULT_TERMS_HTML = `
<h2>1. Acceptance of these terms</h2>
<p>By creating an account, claiming or managing a listing, or otherwise using refereasy.ca ("the Service"), you agree to these Terms of Service and our <a href="/privacy">Privacy Policy</a>. If you don't agree, please don't use the Service.</p>
<h2>2. What ReferEasy is — and isn't</h2>
<p>ReferEasy is a directory that helps referring physicians find specialists, imaging centres, and clinics in Ontario, and lets those providers manage and update their own listing information (availability, wait times, referral criteria, and forms).</p>
<p><strong>ReferEasy is not a medical service, and listing information is not a guarantee.</strong> Wait times, accepting-referral status, and other listing details are set by each provider and may change without notice. Always confirm directly with a provider before relying on any information shown here for a clinical decision. ReferEasy does not practice medicine, provide medical advice, or take responsibility for the accuracy of provider-submitted content.</p>
<h2>3. Accounts</h2>
<p>You must provide accurate information when creating an account and keep your login credentials confidential. You're responsible for activity that happens under your account. Provider accounts must be created by someone authorized to manage that practice's listing; staff accounts inherit access only to the listing(s) they've been invited to.</p>
<h2>4. Acceptable use</h2>
<p>You agree not to: submit false or misleading listing information; use the Service to harvest data about patients or physicians for unrelated purposes; attempt to interfere with or disrupt the Service; or use automated tools to scrape the directory at scale without our written permission.</p>
<h2>5. Provider listings and content</h2>
<p>Providers are responsible for the accuracy of the information and documents (including referral forms) they upload. ReferEasy may review, edit, decline, or remove listing content — including provider-submitted homepage announcements or blog contributions — at our discretion, including for accuracy, quality, or policy reasons.</p>
<h2>6. Plans, trials, and billing</h2>
<p>ReferEasy offers Listed (free), Verified, and Featured plan tiers. Paid tiers may be offered with a free trial period; unless you keep the plan active, it automatically returns to the free Listed tier at the end of the trial, with your data and listing preserved. Where paid billing is enabled, additional billing terms will be presented at the time of purchase.</p>
<h2>7. Intellectual property</h2>
<p>The ReferEasy name, logo, and site design are owned by ReferEasy. Provider listing content remains owned by the provider who submitted it; by submitting it, you grant ReferEasy a license to display it on the Service.</p>
<h2>8. Disclaimers</h2>
<p>The Service is provided "as is" without warranties of any kind, express or implied. We don't warrant that the Service will be uninterrupted, error-free, or that listing information is complete, current, or accurate.</p>
<h2>9. Limitation of liability</h2>
<p>To the maximum extent permitted by law, ReferEasy is not liable for any indirect, incidental, or consequential damages arising from your use of the Service, including reliance on listing information that turns out to be outdated or inaccurate.</p>
<h2>10. Termination</h2>
<p>You may stop using the Service and request account deletion at any time by contacting us. We may suspend or terminate accounts that violate these terms.</p>
<h2>11. Governing law</h2>
<p>These terms are governed by the laws of the Province of Ontario and the federal laws of Canada applicable therein.</p>
<h2>12. Changes to these terms</h2>
<p>We may update these terms from time to time; continued use of the Service after changes take effect means you accept the updated terms.</p>
<h2>13. Contact us</h2>
<p>Questions about these terms? Email <a href="mailto:info.refereasy@gmail.com">info.refereasy@gmail.com</a>.</p>
`.trim()
