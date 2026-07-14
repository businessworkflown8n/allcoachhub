import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useSEO } from "@/hooks/useSEO";
import PromptGeneratorForm from "@/components/prompt/PromptGeneratorForm";
import PromptGeneratorGuard from "@/components/prompt/PromptGeneratorGuard";
import { Sparkles } from "lucide-react";

const PromptGenerator = () => {
  useSEO({
    title: "AI Prompt Generator – Create Expert Prompts Instantly",
    description: "Generate structured, high-performing AI prompts for marketing, copywriting, coding and more. Free AI prompt generator tool.",
    canonical: "https://www.aicoachportal.com/prompt-generator",
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pb-16 pt-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" /> AI-Powered
            </div>
            <h1 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">Prompt Generator</h1>
            <p className="text-muted-foreground">
              Create structured, high-performing prompts for any use case — marketing, coding, automation and more.
            </p>
          </div>
          <PromptGeneratorGuard>
            <div className="rounded-xl border border-border bg-card p-6">
              <PromptGeneratorForm />
            </div>
          </PromptGeneratorGuard>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PromptGenerator;
