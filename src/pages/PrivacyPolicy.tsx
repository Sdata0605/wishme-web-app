import Header from "@/components/Header";
import { Footer } from "@/components/ui/footer";
import { Lock, Eye, Database, ShieldCheck, Globe, Mail, Building2, UserCheck, Cookie, Server } from "lucide-react";
import React from "react";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mt-16">
        {/* Hero Banner */}
        <div className="relative bg-gradient-to-br from-primary/15 via-primary/5 to-background border-b border-border">
          <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Lock className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Your Privacy Matters</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Privacy Policy
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Learn how AllAccess Online Shopping And Business Connect Private, operating as Wishme, collects, uses, and protects your personal information.
              </p>
              <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm text-muted-foreground">
                <span>Last Updated: January 2025</span>
                <span className="hidden sm:inline">•</span>
                <span>Effective: January 2025</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            {/* Quick Nav Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-12">
              {[
                { icon: Database, label: "Data We Collect", href: "#collect" },
                { icon: Eye, label: "How We Use Data", href: "#use" },
                { icon: Globe, label: "Data Sharing", href: "#sharing" },
                { icon: UserCheck, label: "Your Rights", href: "#rights" },
                { icon: ShieldCheck, label: "Data Security", href: "#security" },
                { icon: Mail, label: "Contact Us", href: "#contact" },
              ].map(({ icon: Icon, label, href }) => (
                <a
                  key={href}
                  href={href}
                  className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors text-sm font-medium text-foreground"
                >
                  <Icon className="w-4 h-4 text-primary shrink-0" />
                  {label}
                </a>
              ))}
            </div>

            {/* Important Notice */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 mb-10">
              <h2 className="text-lg font-semibold text-foreground mb-3">Important Information</h2>
              <p className="text-sm text-muted-foreground mb-3">
                This Privacy Policy is an electronic record in terms of the Information Technology Act, 2000 ("IT Act") and rules made thereunder, published in compliance with Section 43A of the IT Act, the SPI Rules 2011, the Intermediaries Guidelines Rules 2011, and the General Data Protection Regulation (GDPR) for users in the European Economic Area and UK.
              </p>
              <p className="text-sm font-semibold text-foreground">
                BY USING THE PLATFORM AND AVAILING THE SERVICES, OR BY OTHERWISE PROVIDING US YOUR INFORMATION, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREED TO THE PRACTICES OUTLINED IN THIS PRIVACY POLICY AND CONSENT TO OUR COLLECTION, USE, SHARING, AND DISCLOSURE OF YOUR INFORMATION AS DESCRIBED HEREIN.
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-8">
              <Section number="1" title="Scope and Application">
                <Subsection title="1.1 About Wishme">
                  <p>
                    AllAccess Online Shopping And Business Connect Private ("we," "our," "us," or "Company") owns, operates, and manages the Wishme platform ("Platform"). AllAccess Online Shopping And Business Connect Private operates under the brand name Wishme to provide services that enable users to request personalised video messages, greetings, and other content from celebrities, create AI-generated content, and access various related features.
                  </p>
                </Subsection>
                <Subsection title="1.2 Who This Policy Applies To">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>All users of the Platform ("Users" or "you")</li>
                    <li>Visitors to our website</li>
                    <li>Celebrities and talent registered on the Platform</li>
                    <li>Anyone who provides us with personal information</li>
                  </ul>
                </Subsection>
                <Subsection title="1.3 What This Policy Covers">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>What information we collect from you</li>
                    <li>How we collect, use, and share your information</li>
                    <li>Your rights and choices</li>
                    <li>How we protect your information</li>
                    <li>International data transfers</li>
                  </ul>
                </Subsection>
                <Subsection title="1.4 Changes to This Policy">
                  <p>
                    We may update this Privacy Policy from time to time. When we make material changes, we will notify you via email or through a prominent notice on our Platform. Your continued use of the Platform after changes constitutes acceptance.
                  </p>
                </Subsection>
              </Section>

              <Section number="2" title="Definitions">
                <Subsection title="2.1 Personal Information">
                  <p>
                    Under the SPI Rules, "Personal Information" means any information that relates to a natural person, which, either directly or indirectly, in combination with other information available, is capable of identifying such person.
                  </p>
                </Subsection>
                <Subsection title="2.2 Sensitive Personal Data or Information">
                  <p className="mb-2">The SPI Rules define "Sensitive Personal Data or Information" as personal information relating to:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Passwords</li>
                    <li>Financial information (bank accounts, credit/debit card details)</li>
                    <li>Physical, physiological, and mental health condition</li>
                    <li>Biometric information</li>
                    <li>Information received under lawful contract</li>
                    <li>Call data records</li>
                  </ul>
                </Subsection>
              </Section>

              <Section id="collect" number="3" title="Information We Collect">
                <Subsection title="3.1 Information You Provide Directly">
                  <InfoGroup title="Account Registration">
                    <CompactList items={["Full name", "Email address", "Password (encrypted)", "Phone number (optional)", "Profile picture (optional)", "Social media account info (if using Social Login)"]} />
                  </InfoGroup>
                  <InfoGroup title="Booking and Transaction Information">
                    <CompactList items={["Recipient name and relationship", "Occasion and delivery date preferences", "Message details and special instructions", "Payment information (processed securely through Razorpay)", "Billing and shipping addresses", "Transaction history"]} />
                  </InfoGroup>
                  <InfoGroup title="Celebrity and Talent Information">
                    <CompactList items={["Professional profile information", "Bank account details (for payments)", "PAN number and tax information", "Identity verification documents", "Voice and likeness data (for AI generation with consent)"]} />
                  </InfoGroup>
                </Subsection>
                <Subsection title="3.2 Information Collected Automatically">
                  <CompactList items={["IP address and device identifiers", "Browser type, version, and operating system", "Pages visited and time spent", "Click patterns and navigation paths", "Referral sources", "Date and time of access"]} />
                </Subsection>
                <Subsection title="3.3 Cookies and Tracking">
                  <p>
                    We use cookies, web beacons, pixels, and similar technologies to remember preferences, keep you logged in, analyse usage, personalise content, and detect fraud. You can manage cookie preferences through our consent banner or browser settings.
                  </p>
                </Subsection>
              </Section>

              <Section id="use" number="4" title="How We Use Your Information">
                <div className="grid sm:grid-cols-2 gap-4">
                  <UsageCard icon={Server} title="Service Delivery" items={["Create and maintain accounts", "Process bookings and payments", "Facilitate user-celebrity communication", "Generate AI-powered content"]} />
                  <UsageCard icon={UserCheck} title="Personalisation" items={["Recommend relevant celebrities", "Remember preferences", "Send occasion reminders", "Show relevant content"]} />
                  <UsageCard icon={Mail} title="Communication" items={["Transactional emails", "Service announcements", "Marketing (with consent)", "WhatsApp notifications"]} />
                  <UsageCard icon={ShieldCheck} title="Safety & Compliance" items={["Verify identity", "Prevent fraud", "Enforce Terms of Service", "Comply with legal obligations"]} />
                </div>
                <Subsection title="4.5 Legal Bases (GDPR)">
                  <p>For EU/EEA users, we process data based on: Contract Performance, Consent, Legitimate Interests, and Legal Obligation.</p>
                </Subsection>
              </Section>

              <Section id="sharing" number="5" title="How We Share Your Information">
                <Subsection title="5.1 With Celebrities">
                  <p>When you book a service, we share your name, recipient details, message content, and delivery requirements with the relevant Celebrity.</p>
                </Subsection>
                <Subsection title="5.2 Service Providers">
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Payment:</strong> Razorpay</li>
                    <li><strong>Cloud Storage:</strong> Backblaze B2</li>
                    <li><strong>Infrastructure:</strong> Supabase</li>
                    <li><strong>AI Services:</strong> OpenAI, ElevenLabs, HeyGen</li>
                    <li><strong>Communication:</strong> WhatsApp Business API, email providers</li>
                  </ul>
                  <p className="mt-2">These providers are contractually obligated to protect your information.</p>
                </Subsection>
                <Subsection title="5.3 No Sale of Personal Information">
                  <p className="font-semibold">We do NOT sell your personal information to third parties for monetary consideration.</p>
                </Subsection>
              </Section>

              <Section id="rights" number="6" title="Your Rights and Choices">
                <Subsection title="6.1 All Users">
                  <CompactList items={["Access and update account information", "Change password and email preferences", "Manage wallet and payment methods", "Opt out of marketing emails", "Manage cookie preferences"]} />
                </Subsection>
                <Subsection title="6.2 GDPR Rights (EU/EEA/UK)">
                  <CompactList items={["Right of Access", "Right to Rectification", "Right to Erasure ('right to be forgotten')", "Right to Restrict Processing", "Right to Data Portability", "Right to Object", "Right to Withdraw Consent", "Right to Lodge a Complaint"]} />
                </Subsection>
                <Subsection title="6.3 Indian Law Rights">
                  <CompactList items={["Review information held by us", "Correct or update your information", "Withdraw consent for certain processing", "Request deletion (subject to legal retention)"]} />
                </Subsection>
                <Subsection title="6.4 California (CCPA) Rights">
                  <CompactList items={["Right to Know", "Right to Delete", "Right to Opt-Out of Sale (we do not sell data)", "Right to Non-Discrimination"]} />
                </Subsection>
                <Subsection title="6.5 Exercising Your Rights">
                  <p>To exercise any rights, email us at <strong>info@wishme.today</strong>. We will respond within 30 days.</p>
                </Subsection>
              </Section>

              <Section number="7" title="Data Retention">
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Account Information:</strong> Until deletion + 90 days</li>
                  <li><strong>Transaction Records:</strong> 7 years (tax and legal compliance)</li>
                  <li><strong>Celebrity Earnings and TDS:</strong> 7 years (Indian tax law)</li>
                  <li><strong>Marketing Communications:</strong> Until opt-out + 2 years</li>
                  <li><strong>Support Communications:</strong> 3 years</li>
                  <li><strong>Analytics Data:</strong> Aggregated indefinitely; individual data 2 years</li>
                </ul>
              </Section>

              <Section id="security" number="8" title="Data Security">
                <Subsection title="8.1 Security Measures">
                  <CompactList items={["Encryption in transit (HTTPS/TLS) and at rest", "Secure authentication and password hashing", "Regular security audits and vulnerability assessments", "Access controls and monitoring", "PCI DSS compliant payment processing via Razorpay"]} />
                </Subsection>
                <Subsection title="8.2 Your Responsibility">
                  <p>Keep your password confidential, use a strong unique password, log out on shared devices, and notify us immediately of any unauthorised access.</p>
                </Subsection>
              </Section>

              <Section number="9" title="International Data Transfers">
                <p>
                  Your information is primarily stored on servers in India. For EU/EEA/UK users, transfers outside the EEA are protected through Standard Contractual Clauses and other legally approved mechanisms. By using the Platform, you consent to transfers as necessary to provide Services.
                </p>
              </Section>

              <Section number="10" title="Children's Privacy">
                <p>
                  Our Platform is not intended for children under 13. Users between 13 and 18 may use the Platform only with parental consent. If you believe we have collected information from a child under 13, please contact us at <strong>info@wishme.today</strong>.
                </p>
              </Section>

              <Section number="11" title="Third-Party Links and Services">
                <p>
                  Our Platform may contain links to third-party websites and services. We are not responsible for their privacy practices. We encourage you to review their privacy policies.
                </p>
              </Section>

              <Section number="12" title="Do Not Track Signals">
                <p>
                  Our Platform does not currently respond to "Do Not Track" (DNT) browser signals as there is no industry standard for responding to them.
                </p>
              </Section>

              <Section number="13" title="Data Protection Officer">
                <p>For privacy-related inquiries, contact our Data Protection Officer at <strong>info@wishme.today</strong> with the subject line "Privacy Rights Request".</p>
              </Section>

              <Section number="14" title="Complaints and Grievances">
                <Subsection title="14.1 Grievance Officer (India)">
                  <p>
                    In accordance with the IT Act, we have appointed a Grievance Officer. Email: <strong>info@wishme.today</strong>. Response time: within 1 month.
                  </p>
                </Subsection>
                <Subsection title="14.2 EU Data Protection Authority">
                  <p>EU/EEA/UK users may lodge a complaint with their local supervisory authority.</p>
                </Subsection>
              </Section>

              <Section id="contact" number="15" title="Contact Us">
                <p className="mb-4">If you have questions about this Privacy Policy or our data practices:</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <ContactCard icon={Mail} label="Email" value="info@wishme.today" />
                  <ContactCard icon={Globe} label="Website" value="wishme.today" />
                  <ContactCard icon={Building2} label="Operated By" value="AllAccess Online Shopping And Business Connect Private" />
                  <ContactCard icon={ShieldCheck} label="Support" value="info@wishme.today" />
                </div>
              </Section>
            </div>

            {/* Final acknowledgement */}
            <div className="mt-12 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                By using Wishme (a platform operated by AllAccess Online Shopping And Business Connect Private), you acknowledge that you have read, understood, and agree to the collection, use, and disclosure of your information as described in this Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

/* ── Reusable sub-components ── */

function Section({ id, number, title, children }: { id?: string; number: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-start gap-4 mb-4">
        <span className="shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary font-bold text-sm">
          {number}
        </span>
        <h2 className="text-xl md:text-2xl font-bold text-foreground pt-1">{title}</h2>
      </div>
      <div className="pl-14 space-y-4 text-muted-foreground leading-relaxed text-[15px]">
        {children}
      </div>
    </section>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold text-foreground mb-2">{title}</h3>
      {children}
    </div>
  );
}

function InfoGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <h4 className="text-sm font-medium text-foreground mb-1">{title}</h4>
      {children}
    </div>
  );
}

function CompactList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  );
}

function UsageCard({ icon: Icon, title, items }: { icon: React.ElementType; title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-primary" />
        <h4 className="font-semibold text-foreground text-sm">{title}</h4>
      </div>
      <ul className="space-y-1 text-sm">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContactCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
      <Icon className="w-5 h-5 text-primary shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
