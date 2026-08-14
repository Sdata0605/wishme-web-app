import * as React from "react";
import { Info, ChevronDown, Lightbulb, HelpCircle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface Step {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

interface FAQ {
  q: string;
  a: string;
}

interface ServiceGuideProps {
  title: string;
  description: string;
  steps: Step[];
  tips?: string[];
  faqs?: FAQ[];
  className?: string;
}

export function ServiceGuide({ title, description, steps, tips, faqs, className }: ServiceGuideProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = React.useState(!isMobile);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn("w-full", className)}>
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-[hsl(var(--card))]/90 to-[hsl(var(--card))]/70 backdrop-blur-md overflow-hidden shadow-lg">
        {/* Header / Trigger */}
        <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 md:px-6 md:py-4 hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15">
              <Info className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-sm md:text-base text-foreground">{title}</span>
          </div>
          <ChevronDown className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </CollapsibleTrigger>

        {/* Content */}
        <CollapsibleContent>
          <div className="px-4 pb-4 md:px-6 md:pb-6 space-y-5">
            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

            {/* Steps Timeline */}
            <div className="relative">
              {/* Desktop: horizontal */}
              <div className="hidden md:grid gap-1" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
                {steps.map((step, i) => (
                  <div key={i} className="relative flex flex-col items-center text-center px-2">
                    {/* Connector line */}
                    {i < steps.length - 1 && (
                      <div className="absolute top-5 left-[calc(50%+20px)] right-[calc(-50%+20px)] h-px bg-gradient-to-r from-primary/40 to-primary/10" />
                    )}
                    {/* Step circle */}
                    <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-primary/15 border border-primary/30 mb-2.5">
                      <span className="text-primary">{step.icon}</span>
                    </div>
                    <span className="text-xs font-semibold text-foreground mb-1">{step.title}</span>
                    <span className="text-[11px] text-muted-foreground leading-tight">{step.desc}</span>
                  </div>
                ))}
              </div>

              {/* Mobile: vertical */}
              <div className="md:hidden space-y-0">
                {steps.map((step, i) => (
                  <div key={i} className="flex gap-3">
                    {/* Vertical line + circle */}
                    <div className="flex flex-col items-center">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex-shrink-0">
                        <span className="text-primary text-sm">{step.icon}</span>
                      </div>
                      {i < steps.length - 1 && (
                        <div className="w-px flex-1 min-h-[16px] bg-gradient-to-b from-primary/30 to-primary/5" />
                      )}
                    </div>
                    {/* Text */}
                    <div className="pb-4">
                      <span className="text-xs font-semibold text-foreground">{step.title}</span>
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            {tips && tips.length > 0 && (
              <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 md:p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">Pro Tips</span>
                </div>
                <ul className="space-y-1.5">
                  {tips.map((tip, i) => (
                    <li key={i} className="text-[11px] md:text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* FAQ Accordion */}
            {faqs && faqs.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <HelpCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground">Frequently Asked</span>
                </div>
                <Accordion type="single" collapsible className="space-y-1">
                  {faqs.map((faq, i) => (
                    <AccordionItem key={i} value={`faq-${i}`} className="border border-white/5 rounded-lg px-3 overflow-hidden">
                      <AccordionTrigger className="text-xs py-2.5 hover:no-underline">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-[11px] text-muted-foreground pb-3">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
