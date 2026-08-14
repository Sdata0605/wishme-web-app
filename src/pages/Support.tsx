import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import { Footer } from "@/components/ui/footer";
import { Mail, Phone, MessageCircle, Search, HelpCircle, Globe, Clock, Send, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Support = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [searchQuery, setSearchQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Support request submitted! We'll get back to you within 24 hours.");
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  const faqs = [
    {
      question: "How long does it take to receive a celebrity video?",
      answer: "Most celebrity videos are delivered within 7-14 days after the celebrity accepts your request. Some celebrities may deliver faster, while others may take up to 30 days depending on their schedule."
    },
    {
      question: "What happens if a celebrity declines my request?",
      answer: "If a celebrity declines your request or doesn't respond within 7 days, you'll receive a full refund to your original payment method within 5-7 business days."
    },
    {
      question: "Can I request revisions for my video?",
      answer: "Minor corrections (like name pronunciation) can be requested within 48 hours of delivery. Major changes are not typically accommodated, so please provide clear instructions in your initial request."
    },
    {
      question: "How does the AI music generation work?",
      answer: "Our AI music studio uses advanced algorithms to create original music based on your preferences for genre, mood, and style. You can add lyrics or create instrumental tracks, and even use celebrity voice cloning."
    },
    {
      question: "Are the celebrity videos real or AI-generated?",
      answer: "We offer both options! You can choose between authentic video messages recorded by the celebrity themselves, or AI-generated videos that use the celebrity's voice and likeness (with their consent)."
    },
    {
      question: "How do I become a celebrity on the platform?",
      answer: "Visit our 'Join as Celebrity' page and fill out the application. Our team will review your profile and get back to you within 5 business days if you meet our criteria."
    }
  ];

  const filteredFaqs = searchQuery
    ? faqs.filter(f => f.question.toLowerCase().includes(searchQuery.toLowerCase()) || f.answer.toLowerCase().includes(searchQuery.toLowerCase()))
    : faqs;

  const supportChannels = [
    {
      icon: Mail,
      title: "Email Support",
      description: "Send us a detailed message and we'll respond promptly.",
      contact: "support@wishme.today",
      responseTime: "Within 24 hours",
      color: "bg-primary/10 text-primary",
    },
    {
      icon: Phone,
      title: "Phone Support",
      description: "Speak directly to our support team for urgent issues.",
      contact: "+91 98765 43210",
      responseTime: "Mon–Fri, 9 AM – 6 PM IST",
      color: "bg-chart-2/10 text-chart-2",
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      description: "Get instant help through our in-app chat assistant.",
      contact: "Available in dashboard",
      responseTime: "Instant",
      color: "bg-chart-4/10 text-chart-4",
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mt-16">
        {/* Hero Banner */}
        <div className="relative bg-gradient-to-br from-primary/15 via-primary/5 to-background border-b border-border">
          <div className="container mx-auto px-4 py-16 md:py-24">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <HelpCircle className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">Help Centre</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                How Can We Help You?
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Find answers, get support, and connect with our team at Wishme.
              </p>
              <div className="max-w-xl mx-auto relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search for help topics..."
                  className="pl-12 h-12 text-base bg-card border-border"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-5xl mx-auto">
            {/* Support Channels */}
            <div className="grid md:grid-cols-3 gap-4 mb-16">
              {supportChannels.map((channel) => {
                const Icon = channel.icon;
                return (
                  <Card key={channel.title} className="border-border hover:border-primary/30 transition-colors">
                    <CardContent className="p-6">
                      <div className={`w-12 h-12 rounded-xl ${channel.color} flex items-center justify-center mb-4`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">{channel.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{channel.description}</p>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">{channel.contact}</p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          {channel.responseTime}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* FAQs */}
            <div className="mb-16">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Frequently Asked Questions</h2>
                <p className="text-muted-foreground">Quick answers to common questions</p>
              </div>
              <div className="max-w-3xl mx-auto">
                <Accordion type="single" collapsible className="space-y-2">
                  {filteredFaqs.map((faq, index) => (
                    <AccordionItem
                      key={index}
                      value={`item-${index}`}
                      className="border border-border rounded-lg px-4 data-[state=open]:bg-accent/30"
                    >
                      <AccordionTrigger className="text-left text-[15px] font-medium hover:no-underline py-4">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground text-sm leading-relaxed pb-4">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
                {filteredFaqs.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No results found. Try a different search term or contact us below.</p>
                )}
              </div>
            </div>

            {/* Contact Form */}
            <div className="max-w-2xl mx-auto mb-16">
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Send Us a Message</h2>
                <p className="text-muted-foreground">Can't find what you're looking for? We're here to help.</p>
              </div>
              <Card className="border-border">
                <CardContent className="p-6 md:p-8">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Your Name</Label>
                        <Input
                          id="name"
                          placeholder="John Doe"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        placeholder="What do you need help with?"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        rows={5}
                        placeholder="Describe your issue in detail..."
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" size="lg">
                      <Send className="w-4 h-4 mr-2" />
                      Submit Request
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Quick Links */}
            <div className="rounded-xl border border-border bg-card p-6 md:p-8">
              <h3 className="text-lg font-semibold text-foreground mb-4">Quick Links</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { label: "Privacy Policy", href: "/privacy-policy" },
                  { label: "Terms & Conditions", href: "/terms" },
                  { label: "Refund Policy", href: "/refund-policy" },
                  { label: "How It Works", href: "/how-it-works" },
                ].map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors text-sm font-medium text-foreground"
                  >
                    {link.label}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </a>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-border flex flex-wrap gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" />
                  <span>support@wishme.today</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  <span>wishme.today</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Support;
