import { Link } from "react-router-dom";
import { DollarSign, Users, Zap, ShieldCheck, TrendingUp, Globe } from "lucide-react";

const reasons = [
  { icon: DollarSign, title: "Earn ₹50,000+/month", desc: "Set your own prices and grow a sustainable coaching income with our learner marketplace." },
  { icon: Users, title: "Get 20+ Leads/month", desc: "Our matching engine connects you with learners actively looking for your expertise." },
  { icon: Zap, title: "Setup in 2 Minutes", desc: "One-click onboarding, AI profile builder, and instant dashboard access." },
  { icon: Globe, title: "Your Own Brand Page", desc: "Get a custom SEO-optimized coaching website to attract and convert clients." },
  { icon: ShieldCheck, title: "Verified Coach Badge", desc: "Stand out with our verification system that builds trust with learners." },
  { icon: TrendingUp, title: "AI Growth Tools", desc: "Content review, demand insights, coupons, and bundles to scale your business." },
];

const WhyCoachesJoinSection = () => (
  <section className="py-16 md:py-24 bg-secondary/30">
    <div className="container mx-auto px-4 max-w-6xl">
      <div className="text-center mb-12">
        <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary mb-4">
          For Coaches
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Why Coaches Join Us
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Join 100+ AI coaches building thriving coaching businesses on our platform.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-12">
        {reasons.map((r) => (
          <div key={r.title} className="rounded-xl border border-border bg-card p-6 space-y-3 hover:border-primary/40 transition-colors">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <r.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">{r.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Scarcity + CTA */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-8 text-center space-y-4">
        <p className="text-sm font-medium text-primary">🔥 Only 100 coaches accepted this month</p>
        <h3 className="text-2xl font-bold text-foreground">Start Coaching & Earning Today</h3>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Your first 5 client leads are FREE. No upfront cost, no risk.
        </p>
        <Link to="/signup/coach" className="cta-3d primary lg">
          Join as a Coach — It's Free
        </Link>
      </div>
    </div>
  </section>
);

export default WhyCoachesJoinSection;
