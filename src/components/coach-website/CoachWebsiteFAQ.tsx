import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface Props {
  contentSections?: any;
}

const defaultFaqs = [
  { q: "What is the course duration?", a: "Course durations vary by program. Each course page lists the total hours and expected completion timeline." },
  { q: "Will I get a certificate?", a: "Yes, you will receive a certificate of completion upon finishing the course and passing all assessments." },
  { q: "Are the sessions live or recorded?", a: "We offer both live sessions and recorded content. Live sessions allow real-time interaction with the coach." },
  { q: "Is there placement support?", a: "Yes, we provide resume reviews, mock interviews, and career guidance to help you land your desired role." },
  { q: "What is the refund policy?", a: "We offer a satisfaction guarantee. If you're not happy within the first 7 days, you can request a full refund." },
];

const CoachWebsiteFAQ = ({ contentSections }: Props) => {
  const faqs = (contentSections?.faqs?.length > 0 ? contentSections.faqs : defaultFaqs).filter((f: any) => f.q && f.a);

  if (faqs.length === 0) return null;

  return (
    <section id="cw-faq" className="border-b border-border py-14">
      <div className="container mx-auto px-4">
        <h2 className="mb-8 text-center text-2xl font-bold text-foreground">Frequently Asked Questions</h2>
        <div className="mx-auto max-w-2xl">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f: any, i: number) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-sm font-medium">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default CoachWebsiteFAQ;
