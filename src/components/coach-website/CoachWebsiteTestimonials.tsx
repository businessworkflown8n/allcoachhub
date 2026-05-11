import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

interface Props {
  themeColor: string;
  contentSections?: any;
}

const defaultTestimonials = [
  { name: "Raj S.", role: "Data Analyst", text: "This program completely changed my career trajectory. The hands-on projects were incredibly valuable.", rating: 5 },
  { name: "Priya M.", role: "Marketing Manager", text: "The coach was extremely knowledgeable and always available for doubts. Best investment I've made.", rating: 5 },
  { name: "Amit K.", role: "Software Engineer", text: "Practical and well-structured. I landed a new role within 2 months of completing the course.", rating: 5 },
];

const CoachWebsiteTestimonials = ({ themeColor, contentSections }: Props) => {
  const testimonials = (contentSections?.testimonials?.length > 0 ? contentSections.testimonials : defaultTestimonials).filter((t: any) => t.name && t.text);
  const [idx, setIdx] = useState(0);

  if (testimonials.length === 0) return null;

  const prev = () => setIdx((i) => (i === 0 ? testimonials.length - 1 : i - 1));
  const next = () => setIdx((i) => (i === testimonials.length - 1 ? 0 : i + 1));
  const t = testimonials[idx];

  return (
    <section id="cw-testimonials" className="border-b border-border bg-secondary/20 py-14">
      <div className="container mx-auto px-4">
        <h2 className="mb-8 text-center text-2xl font-bold text-foreground">What Our Students Say</h2>
        <div className="mx-auto max-w-xl text-center">
          <div className="mb-4 flex justify-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`h-5 w-5 ${i < t.rating ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"}`} />
            ))}
          </div>
          <blockquote className="text-base italic text-muted-foreground leading-relaxed">"{t.text}"</blockquote>
          <p className="mt-4 font-semibold text-foreground">{t.name}</p>
          <p className="text-xs text-muted-foreground">{t.role}</p>

          {testimonials.length > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <button onClick={prev} className="rounded-full border border-border p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-muted-foreground">{idx + 1} / {testimonials.length}</span>
              <button onClick={next} className="rounded-full border border-border p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default CoachWebsiteTestimonials;
