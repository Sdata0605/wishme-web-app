import Header from "@/components/Header";
import { Footer } from "@/components/ui/footer";
import { RotateCcw, Mail, Globe, Building2, ShieldCheck, CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react";
import React from "react";

const RefundPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mt-16">
        {/* Hero Banner */}
        <div className="relative bg-gradient-to-br from-primary/15 via-primary/5 to-background border-b border-border">
          <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <RotateCcw className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Refund Policy</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Refund Policy
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Understand our refund terms for services offered on the Wishme platform, operated by AllAccess Online Shopping And Business Connect Private.
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
            {/* Overview Cards */}
            <div className="grid sm:grid-cols-3 gap-4 mb-12">
              <SummaryCard icon={Clock} label="Processing Time" value="5–7 business days" />
              <SummaryCard icon={RotateCcw} label="Refund Method" value="Original payment method" />
              <SummaryCard icon={ShieldCheck} label="Support" value="support@wishme.today" />
            </div>

            {/* Sections */}
            <div className="space-y-8">
              <Section number="1" title="Celebrity Video Messages">
                <RefundTable
                  eligible={[
                    "The celebrity declines your request within 7 days",
                    "The video is not delivered within the promised timeframe (typically 7–14 days)",
                    "The video does not meet the specified requirements you provided",
                  ]}
                  ineligible={[
                    "You change your mind after the celebrity has accepted the request",
                    "The celebrity has already started working on your video",
                    "Minor pronunciation errors or slight variations in content",
                  ]}
                />
              </Section>

              <Section number="2" title="Subscription Plans">
                <Subsection title="Monthly Plans">
                  <CompactList items={[
                    "Refunds available within 7 days of purchase if no services have been used",
                    "Pro-rated refunds for technical issues that prevent service usage",
                    "Cancellation takes effect at the end of the current billing period",
                  ]} />
                </Subsection>
                <Subsection title="Annual Plans">
                  <CompactList items={[
                    "30-day money-back guarantee if minimal usage (less than 2 bookings)",
                    "Pro-rated refunds for extended service outages",
                  ]} />
                </Subsection>
              </Section>

              <Section number="3" title="AI Music Generation">
                <RefundTable
                  eligible={[
                    "The AI fails to generate your music within 24 hours",
                    "Technical errors prevent music generation",
                    "Generated music is corrupted or unplayable",
                  ]}
                  ineligible={[
                    "You're unsatisfied with the creative output (music is subjective)",
                    "Music has already been downloaded",
                    "You change your mind after generation is complete",
                  ]}
                />
              </Section>

              <Section number="4" title="Business Campaigns">
                <p className="mb-3">Business campaign refunds are handled on a case-by-case basis:</p>
                <CompactList items={[
                  "50% refund if celebrity withdraws before campaign starts",
                  "No refund if campaign has already launched",
                  "Pro-rated refunds for service failures or non-delivery",
                ]} />
              </Section>

              <Section number="5" title="Refund Processing">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <h4 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" /> Timeline
                    </h4>
                    <CompactList items={[
                      "Requests processed within 5–7 business days",
                      "Approved refunds credited within 7–10 business days",
                      "Refunds issued to the original payment method",
                    ]} />
                  </div>
                  <div className="rounded-lg border border-border bg-card p-4">
                    <h4 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-primary" /> How to Request
                    </h4>
                    <CompactList items={[
                      "Contact support at support@wishme.today",
                      "Provide order number and reason for refund",
                      "Include any relevant screenshots or documentation",
                    ]} />
                  </div>
                </div>
              </Section>

              <Section number="6" title="Wallet Credits">
                <p className="mb-3">In some cases, we may offer Wishme wallet credits instead of cash refunds:</p>
                <CompactList items={[
                  "Credits never expire and can be used for any service",
                  "Credits may include a bonus amount (typically 10–20% extra)",
                  "You can choose between cash refund or wallet credits",
                ]} />
              </Section>

              <Section number="7" title="Non-Refundable Items">
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <h4 className="font-semibold text-foreground text-sm">The following are non-refundable:</h4>
                  </div>
                  <CompactList items={[
                    "Promotional or discounted services (unless defective)",
                    "Third-party services or products",
                    "Processing fees and transaction charges",
                    "Services fully delivered as specified",
                  ]} />
                </div>
              </Section>

              <Section number="8" title="Dispute Resolution">
                <p>If your refund request is denied and you disagree:</p>
                <CompactList items={[
                  "You can escalate to our senior support team",
                  "We'll review your case within 48 hours",
                  "Final decisions are made by our management team",
                ]} />
              </Section>

              <Section number="9" title="Contact Information">
                <p className="mb-4">For refund requests or questions about this policy:</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <ContactCard icon={Mail} label="Email" value="support@wishme.today" />
                  <ContactCard icon={Globe} label="Website" value="wishme.today" />
                  <ContactCard icon={Building2} label="Operated By" value="AllAccess Online Shopping And Business Connect Private" />
                  <ContactCard icon={ShieldCheck} label="Dashboard" value="Support Portal" />
                </div>
              </Section>

              <Section number="10" title="Policy Updates">
                <p>
                  We reserve the right to update this refund policy at any time. Changes will be posted on this page with an updated revision date. Continued use of our services after changes constitutes acceptance of the new policy.
                </p>
              </Section>
            </div>

            {/* Final acknowledgement */}
            <div className="mt-12 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Wishme is a platform operated by AllAccess Online Shopping And Business Connect Private. For any refund-related queries, reach out to us at <strong className="text-foreground">support@wishme.today</strong>.
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

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-24">
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

function CompactList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2">
          <span className="w-1 h-1 rounded-full bg-primary mt-2 shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  );
}

function RefundTable({ eligible, ineligible }: { eligible: string[]; ineligible: string[] }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div className="rounded-lg border border-chart-2/30 bg-chart-2/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4 text-chart-2" />
          <h4 className="font-semibold text-foreground text-sm">Full Refund Eligible</h4>
        </div>
        <ul className="space-y-1.5 text-sm">
          {eligible.map(item => (
            <li key={item} className="flex items-start gap-2">
              <span className="w-1 h-1 rounded-full bg-chart-2 mt-2 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <XCircle className="w-4 h-4 text-destructive" />
          <h4 className="font-semibold text-foreground text-sm">No Refund</h4>
        </div>
        <ul className="space-y-1.5 text-sm">
          {ineligible.map(item => (
            <li key={item} className="flex items-start gap-2">
              <span className="w-1 h-1 rounded-full bg-destructive mt-2 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value}</p>
      </div>
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

export default RefundPolicy;
