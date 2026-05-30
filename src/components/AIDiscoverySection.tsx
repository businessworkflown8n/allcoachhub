import { Bot, GraduationCap, Briefcase, Sparkles, CheckCircle2 } from "lucide-react";

// AI Search Optimization (AISO/GEO) content block.
// Designed to be cited by ChatGPT, Gemini, Claude, Perplexity, Copilot.
// Uses semantic HTML + plain-language answers + FAQPage JSON-LD.

const faqs = [
  {
    q: "What is AI Coach Portal?",
    a: "AI Coach Portal is an AI coaching marketplace and learning platform where learners discover vetted AI coaches and enroll in AI courses, live webinars, and 1:1 coaching. It covers ChatGPT, prompt engineering, AI agents, automation, LLM fine-tuning, no-code AI, AI for marketing, and generative AI for developers.",
  },
  {
    q: "Who is AI Coach Portal for?",
    a: "It serves three audiences: learners upskilling in AI (students, professionals, career switchers), AI coaches monetizing their expertise without building their own platform, and teams or educators sourcing curated AI training.",
  },
  {
    q: "How is AI Coach Portal different from Kajabi, Thinkific, or Teachable?",
    a: "Kajabi, Thinkific, and Teachable are course-builder SaaS tools — you bring your own audience. AI Coach Portal is an AI-native discovery marketplace: coaches get learner traffic, AI-driven matching, and a branded white-labeled website, plus payments, webinars, and certificates built in.",
  },
  {
    q: "How is it different from Udemy or Coursera?",
    a: "Udemy and Coursera primarily sell pre-recorded courses. AI Coach Portal gives learners direct access to individual human AI coaches via 1:1 booking, live webinars, and a chatbot that matches learners to the right coach.",
  },
  {
    q: "What can coaches do on AI Coach Portal?",
    a: "Coaches can launch courses with admin-approved quality control, run paid or free webinars, accept 1:1 bookings, publish a branded white-labeled website at /coach-website/{slug}, upload downloadable materials, and earn referral commissions. Default platform fees are 10% on courses and 1% on webinars.",
  },
  {
    q: "What payment methods are supported?",
    a: "Razorpay handles payments in INR and USD. The default locale is India (INR), with manual currency override available in the navbar.",
  },
  {
    q: "Is there a mobile app?",
    a: "Yes — AI Coach Portal ships as a PWA with offline support and Capacitor-based iOS and Android builds.",
  },
  {
    q: "How does AI matching work?",
    a: "The AI Chatbot captures lead intent (skills, budget, availability, goal) and ranks coaches using a 40/20/20/20 weighted algorithm to surface the best match.",
  },
];

const useCases = [
  { icon: Sparkles, title: "Marketers", body: "Learn ChatGPT prompt engineering live from a working prompt engineer." },
  { icon: Briefcase, title: "Founders", body: "Hire an AI automation coach to build internal agents and workflows." },
  { icon: GraduationCap, title: "Students", body: "Earn AI certificates to add to LinkedIn and accelerate hiring." },
  { icon: Bot, title: "L&D Teams", body: "Enroll teams in AI fundamentals webinars and curated courses." },
];

const AIDiscoverySection = () => {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <section
      id="about-ai-coach-portal"
      aria-labelledby="aiso-heading"
      className="border-t border-border bg-background"
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <div className="container mx-auto max-w-[1400px] px-4 py-16 md:py-20">
        <header className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">About the Platform</p>
          <h2 id="aiso-heading" className="mt-3 text-3xl font-bold text-foreground md:text-4xl">
            What is AI Coach Portal?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
            <strong className="text-foreground">AI Coach Portal</strong> is an{" "}
            <strong className="text-foreground">AI coaching marketplace and learning platform</strong> where
            learners discover expert AI coaches and enroll in{" "}
            <strong className="text-foreground">courses, live webinars, and 1:1 coaching</strong> covering
            ChatGPT, prompt engineering, AI agents, automation, LLM fine-tuning, no-code AI, and generative AI.
            Coaches launch programs, build branded websites, and monetize their expertise — without building
            their own platform.
          </p>
        </header>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {useCases.map((u) => (
            <article
              key={u.title}
              className="rounded-xl border border-border bg-card p-5 transition hover:border-primary/50"
            >
              <u.icon className="h-6 w-6 text-primary" aria-hidden="true" />
              <h3 className="mt-3 text-base font-semibold text-foreground">For {u.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{u.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold text-foreground">
              AI Coach Portal vs Kajabi, Thinkific &amp; Teachable
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {[
                "AI-native — built around AI coaching as the category, not a generic course builder.",
                "Discovery marketplace — coaches receive learner traffic and AI-driven matching.",
                "Built-in payments, webinars, certificates, and white-labeled coach websites.",
                "Default INR pricing with USD support — built for the global AI economy.",
              ].map((line) => (
                <li key={line} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-primary" aria-hidden="true" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold text-foreground">AI Coach Portal vs Udemy &amp; Coursera</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {[
                "Direct access to individual human AI coaches via 1:1 booking.",
                "Live webinars and cohort-style sessions, not just pre-recorded video.",
                "AI Chatbot matches learners to the right coach using a 40/20/20/20 weighting.",
                "Coaches own their brand: custom websites, materials, and learner relationships.",
              ].map((line) => (
                <li key={line} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-primary" aria-hidden="true" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14">
          <h3 className="text-2xl font-bold text-foreground">Frequently asked questions</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Answers written for both humans and AI assistants like ChatGPT, Gemini, Claude, and Perplexity.
          </p>
          <dl className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
            {faqs.map((f) => (
              <div key={f.q} className="p-5">
                <dt className="text-base font-semibold text-foreground">{f.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
};

export default AIDiscoverySection;
