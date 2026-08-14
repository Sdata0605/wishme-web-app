import Header from "@/components/Header";
import { Footer } from "@/components/ui/footer";
import { Shield, FileText, Star, Mail, Globe, Building2 } from "lucide-react";

const CelebrityAgreement = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mt-16">
        {/* Hero Banner */}
        <div className="relative bg-gradient-to-br from-primary/15 via-primary/5 to-background border-b border-border">
          <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Star className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Celebrity Partnership</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                Celebrity Agreement
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                This agreement governs your participation as a celebrity on the Wishme platform, operated by AllAccess Online Shopping And Business Connect Private.
              </p>
              <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm text-muted-foreground">
                <span>Last Updated: January 2025</span>
                <span className="hidden sm:inline">•</span>
                <span>Effective: January 2025</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Reference Card */}
        <div className="container mx-auto px-4 -mt-8 relative z-10 mb-12">
          <div className="max-w-4xl mx-auto">
            <div className="bg-card rounded-xl border border-border shadow-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Operated By</p>
                    <p className="text-sm text-muted-foreground">AllAccess Online Shopping And Business Connect Private</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Celebrity Support</p>
                    <p className="text-sm text-muted-foreground">celebrity@wishme.today</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Globe className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Website</p>
                    <p className="text-sm text-muted-foreground">wishme.today</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Agreement Content */}
        <div className="container mx-auto px-4 pb-16">
          <div className="max-w-4xl mx-auto space-y-8">

            <AgreementSection number="1" title="Agreement Overview">
              <p className="text-muted-foreground leading-relaxed">
                This Celebrity Agreement ("Agreement") is entered into between AllAccess Online Shopping And Business Connect Private operating as Wishme ("Platform") and you ("Celebrity") upon your acceptance. By creating a celebrity account, you agree to the following terms governing your participation on our platform.
              </p>
            </AgreementSection>

            <AgreementSection number="2" title="Service Requirements">
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">2.1 Content Delivery</h3>
              <p className="text-muted-foreground mb-2">As a Celebrity on our platform, you agree to:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li>Deliver all booked content within the specified timeframe (default: 7 days)</li>
                <li>Ensure content meets professional quality standards</li>
                <li>Follow the customer's instructions and specifications</li>
                <li>Provide authentic, original content in each delivery</li>
              </ul>

              <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">2.2 Service Availability</h3>
              <p className="text-muted-foreground mb-2">You agree to:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li>Keep your availability status updated</li>
                <li>Respond to booking requests within 48 hours</li>
                <li>Notify the platform of extended unavailability (7+ days)</li>
                <li>Maintain consistent service quality</li>
              </ul>
            </AgreementSection>

            <AgreementSection number="3" title="Revenue Share and Payments">
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">3.1 Commission Structure</h3>
              <p className="text-muted-foreground">
                Your commission rate is set by the platform administrator and displayed in your profile. The standard commission structure allocates a percentage of each booking to you, with the remainder going to platform fees and operational costs.
              </p>

              <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">3.2 Pricing</h3>
              <p className="text-muted-foreground">
                Service prices are managed by platform administrators to ensure market consistency and fairness. You will be notified of any price changes to your services.
              </p>

              <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">3.3 Payment Terms</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li>Payments are processed after content delivery and customer acceptance</li>
                <li>Funds are transferred to your registered bank account</li>
                <li>Payment cycles: Weekly or monthly based on your preference</li>
                <li>Minimum payout threshold: ₹5,000</li>
              </ul>
            </AgreementSection>

            <AgreementSection number="4" title="Content Ownership and Usage">
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">4.1 Customer Content Rights</h3>
              <p className="text-muted-foreground">
                Content you create for customers belongs to them for personal use. Customers receive a limited, non-transferable license for personal enjoyment and sharing.
              </p>

              <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">4.2 Platform Usage Rights</h3>
              <p className="text-muted-foreground mb-2">You grant the platform:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li>Right to display sample content for promotional purposes</li>
                <li>Right to use your name, image, and likeness in marketing materials</li>
                <li>Right to showcase customer testimonials and reviews</li>
              </ul>
            </AgreementSection>

            <AgreementSection number="5" title="AI Avatar Consent">
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">5.1 Voice and Likeness</h3>
              <p className="text-muted-foreground mb-2">By agreeing to this contract, you consent to:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li>Training of AI models using your voice samples (if applicable)</li>
                <li>Creation of a digital avatar based on your likeness (if applicable)</li>
                <li>Use of your AI avatar for generating content as per customer bookings</li>
              </ul>

              <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">5.2 AI Content Limitations</h3>
              <p className="text-muted-foreground mb-2">AI-generated content using your likeness:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li>Must comply with content guidelines and restrictions</li>
                <li>Cannot be used for political endorsements without explicit consent</li>
                <li>Cannot be used for defamatory or harmful content</li>
                <li>Remains under your control — you can revoke AI consent anytime</li>
              </ul>
            </AgreementSection>

            <AgreementSection number="6" title="Verification and Identity">
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">6.1 Documentation</h3>
              <p className="text-muted-foreground mb-2">You must provide:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li>Valid government-issued photo ID</li>
                <li>Proof of identity through video verification (if required)</li>
                <li>Tax identification documents (PAN, Aadhaar)</li>
                <li>Bank account details for payments</li>
              </ul>

              <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">6.2 Background Checks</h3>
              <p className="text-muted-foreground">
                You consent to background verification to ensure platform safety and authenticity. This may include verification of professional credentials and social media presence.
              </p>
            </AgreementSection>

            <AgreementSection number="7" title="Content Guidelines and Restrictions">
              <p className="text-muted-foreground mb-2">You agree NOT to create content that includes:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li>Offensive, discriminatory, or hateful speech</li>
                <li>Political endorsements (unless explicitly agreed)</li>
                <li>False medical, legal, or financial advice</li>
                <li>Explicit adult content</li>
                <li>Promotion of illegal activities</li>
                <li>Infringement of third-party intellectual property</li>
                <li>Defamatory or harmful statements about individuals or entities</li>
              </ul>
            </AgreementSection>

            <AgreementSection number="8" title="Performance Standards">
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">8.1 Quality Expectations</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li>Content must be recorded in good lighting and audio quality</li>
                <li>Videos should be at least the minimum length specified (typically 30 seconds)</li>
                <li>Content must be personalized according to customer instructions</li>
                <li>Professional demeanor and presentation expected</li>
              </ul>

              <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">8.2 Customer Satisfaction</h3>
              <p className="text-muted-foreground mb-2">Maintain a minimum rating of 4.0 stars. Consistently low ratings may result in:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li>Profile review and coaching</li>
                <li>Temporary suspension</li>
                <li>Account termination in extreme cases</li>
              </ul>
            </AgreementSection>

            <AgreementSection number="9" title="Account Suspension and Termination">
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">9.1 Platform Rights</h3>
              <p className="text-muted-foreground mb-2">We reserve the right to suspend or terminate your account for:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li>Violation of content guidelines</li>
                <li>Repeated failure to deliver content</li>
                <li>Customer complaints and poor ratings</li>
                <li>Fraudulent activity or misrepresentation</li>
                <li>Violation of this agreement</li>
              </ul>

              <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">9.2 Celebrity Rights</h3>
              <p className="text-muted-foreground mb-2">You may terminate this agreement at any time by:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li>Providing 30 days notice</li>
                <li>Completing all pending bookings</li>
                <li>Resolving any outstanding payment or dispute issues</li>
              </ul>
            </AgreementSection>

            <AgreementSection number="10" title="Confidentiality">
              <p className="text-muted-foreground mb-2">You agree to:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li>Keep customer personal information confidential</li>
                <li>Not share customer booking details publicly</li>
                <li>Protect platform business information and trade secrets</li>
                <li>Not disclose payment and commission structures to third parties</li>
              </ul>
            </AgreementSection>

            <AgreementSection number="11" title="Taxes and Legal Compliance">
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">11.1 Tax Responsibility</h3>
              <p className="text-muted-foreground">
                You are responsible for all taxes related to your earnings on the platform. This includes income tax, GST (if applicable), and any other relevant taxes as per Indian tax laws.
              </p>

              <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">11.2 Legal Compliance</h3>
              <p className="text-muted-foreground mb-2">You must:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li>Comply with all applicable laws and regulations</li>
                <li>Maintain valid tax registrations (PAN, GST if required)</li>
                <li>Provide accurate tax documentation</li>
                <li>Report income to tax authorities as required</li>
              </ul>
            </AgreementSection>

            <AgreementSection number="12" title="Liability and Indemnification">
              <h3 className="text-lg font-semibold text-foreground mt-4 mb-2">12.1 Your Liability</h3>
              <p className="text-muted-foreground mb-2">You are liable for:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li>Content you create and deliver</li>
                <li>Any legal claims arising from your content</li>
                <li>Violation of third-party rights</li>
                <li>Breach of this agreement</li>
              </ul>

              <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">12.2 Indemnification</h3>
              <p className="text-muted-foreground">
                You agree to indemnify and hold harmless AllAccess Online Shopping And Business Connect Private operating as Wishme, its officers, employees, and partners from any claims, damages, losses, or expenses arising from your breach of this agreement or violation of any laws.
              </p>
            </AgreementSection>

            <AgreementSection number="13" title="Dispute Resolution">
              <p className="text-muted-foreground">
                Any disputes arising from this agreement will be resolved through arbitration in accordance with the Indian Arbitration and Conciliation Act, 1996. The arbitration will be conducted in English and the venue will be in India.
              </p>
            </AgreementSection>

            <AgreementSection number="14" title="Amendments">
              <p className="text-muted-foreground">
                We may modify this agreement at any time. Material changes will be communicated via email and in-app notification. Your continued use of the platform after changes constitutes acceptance of the modified agreement.
              </p>
            </AgreementSection>

            <AgreementSection number="15" title="Governing Law">
              <p className="text-muted-foreground">
                This agreement is governed by the laws of India. Any legal proceedings must be initiated in the courts of India.
              </p>
            </AgreementSection>

            <AgreementSection number="16" title="Contact Information">
              <p className="text-muted-foreground mb-3">For questions about this Celebrity Agreement, contact us at:</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4 text-primary" />
                  <span>celebrity@wishme.today</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4 text-primary" />
                  <span>support@wishme.today</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span>AllAccess Online Shopping And Business Connect Private, India</span>
                </div>
              </div>
            </AgreementSection>

            <AgreementSection number="17" title="Entire Agreement">
              <p className="text-muted-foreground">
                This Celebrity Agreement, together with the Terms of Service and Privacy Policy, constitutes the entire agreement between you and AllAccess Online Shopping And Business Connect Private operating as Wishme regarding your participation as a celebrity on our platform.
              </p>
            </AgreementSection>

            {/* Footer note */}
            <div className="text-center pt-8 border-t border-border">
              <p className="text-sm text-muted-foreground">
                © 2025 AllAccess Online Shopping And Business Connect Private Operating as Wishme. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

function AgreementSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border p-6 md:p-8">
      <div className="flex items-start gap-4 mb-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <span className="text-sm font-bold text-primary">{number}</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-foreground pt-1">{title}</h2>
      </div>
      <div className="ml-14">{children}</div>
    </div>
  );
}

export default CelebrityAgreement;
