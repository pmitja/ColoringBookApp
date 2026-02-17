import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { HeaderSection } from "../shared/header-section";

const pricingFaqData = [
  {
    id: "item-1",
    question: "What is included in the Free tier?",
    answer:
      "The Free tier includes 5-10 generations per month from a shared pool, basic styles, and 1-5 page PDF exports.",
  },
  {
    id: "item-2",
    question: "How much is Starter?",
    answer:
      "Starter is $9.99/month or $79/year. It includes 80 pages per month, HD exports, private mode, and upscale access.",
  },
  {
    id: "item-3",
    question: "How much is Hobby?",
    answer:
      "Hobby is $19.99/month or $179/year with 250 pages monthly, priority queue, 10-page generation, and text overlays.",
  },
  {
    id: "item-4",
    question: "What does Pro unlock?",
    answer:
      "Pro is $39.99/month or $349/year and includes 800 pages per month, high print quality exports, 20+ page books, consistency regeneration, and a commercial license.",
  },
  {
    id: "item-5",
    question: "Can I switch plans later?",
    answer:
      "Yes. You can upgrade, downgrade, or cancel from billing any time, and your access updates with your Stripe subscription period.",
  },
];

export function PricingFaq() {
  return (
    <section className="container max-w-4xl py-2">
      <HeaderSection
        label="FAQ"
        title="Frequently Asked Questions"
        subtitle="Explore our comprehensive FAQ to find quick answers to common
          inquiries. If you need further assistance, don't hesitate to
          contact us for personalized help."
      />

      <Accordion type="single" collapsible className="my-12 w-full">
        {pricingFaqData.map((faqItem) => (
          <AccordionItem key={faqItem.id} value={faqItem.id}>
            <AccordionTrigger>{faqItem.question}</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground sm:text-[15px]">
              {faqItem.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
