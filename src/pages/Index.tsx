import { lazy, Suspense, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import Footer from "@/components/Footer";
import MobileStickyCTA from "@/components/MobileStickyCTA";
import { useSEO } from "@/hooks/useSEO";

// Lazy load below-fold sections
const CategoriesSection = lazy(() => import("@/components/CategoriesSection"));
const CoachesSection = lazy(() => import("@/components/CoachesSection"));
const CoursesSection = lazy(() => import("@/components/CoursesSection"));
const HowItWorksSection = lazy(() => import("@/components/HowItWorksSection"));
const TestimonialsSection = lazy(() => import("@/components/TestimonialsSection"));
const CTASection = lazy(() => import("@/components/CTASection"));
const HomeBlogSection = lazy(() => import("@/components/HomeBlogSection"));
const WhyCoachesJoinSection = lazy(() => import("@/components/WhyCoachesJoinSection"));
const EarningsCalculator = lazy(() => import("@/components/EarningsCalculator"));

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "name": "AI Coach Portal",
  "url": "https://www.aicoachportal.com",
  "description": "AI coach portal & AI learning platform for AI tools, AI skills & automation. Master ChatGPT, AI agents, prompt engineering with expert AI coaching.",
  "sameAs": [
    "https://x.com/Aicoachportal",
    "https://www.linkedin.com/company/aicoachportal/",
    "https://www.instagram.com/aicoachportal/",
    "https://www.facebook.com/people/Aicoachportal/61588588206814/",
    "https://www.youtube.com/@AicoachPortal"
  ],
  "hasOfferCatalog": {
    "@type": "OfferCatalog",
    "name": "AI Training & Coaching Services",
    "itemListElement": [
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Course",
          "name": "AI Tools Training",
          "description": "Learn AI productivity tools, ChatGPT, and AI automation"
        }
      },
      {
        "@type": "Offer",
        "itemOffered": {
          "@type": "Course",
          "name": "AI Skills Development",
          "description": "Master prompt engineering, AI agents, and machine learning"
        }
      }
    ]
  }
};

const SectionFallback = () => (
  <div className="flex min-h-[200px] items-center justify-center">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const Index = () => {
  const location = useLocation();

  useSEO({
    title: "AI Coach Portal – Learn AI Tools, AI Skills & Automation",
    description: "Top AI learning platform for AI tools, AI coaching & AI skills training. Master ChatGPT, AI agents, automation & prompt engineering with expert coaches.",
    canonical: "https://www.aicoachportal.com/",
    ogTitle: "AI Coach Portal – Learn AI Tools, AI Skills & Automation",
    ogDescription: "Top AI learning platform for AI tools, AI coaching & AI skills training. Master ChatGPT, AI agents, automation & prompt engineering with expert coaches.",
  });

  useEffect(() => {
    if (location.hash) {
      setTimeout(() => {
        const el = document.querySelector(location.hash);
        el?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar />
      <header id="hero">
        <HeroSection />
      </header>
      <main>
        <Suspense fallback={<SectionFallback />}>
          <section id="categories"><CategoriesSection /></section>
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <section id="coaches"><CoachesSection /></section>
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <section id="courses"><CoursesSection /></section>
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <section id="how-it-works"><HowItWorksSection /></section>
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <section id="testimonials"><TestimonialsSection /></section>
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <section id="why-coaches"><WhyCoachesJoinSection /></section>
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <section id="earnings-calculator"><EarningsCalculator /></section>
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <section id="blogs"><HomeBlogSection /></section>
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <section id="cta"><CTASection /></section>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
