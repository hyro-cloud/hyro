'use client';

import { SectionShell } from '@/components/landing/section-shell';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { FAQ } from '@/lib/content';

export function FaqSection() {
  return (
    <SectionShell
      id="faq"
      label="faq"
      title="Questions from the terminal"
      description="Everything you need to know before your first `hyro run`."
    >
      <Accordion type="single" collapsible className="max-w-3xl">
        {FAQ.map((item, i) => (
          <AccordionItem key={item.q} value={`item-${i}`}>
            <AccordionTrigger>{item.q}</AccordionTrigger>
            <AccordionContent>{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </SectionShell>
  );
}
