import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import { LEGAL_DOCS, type LegalSlug } from "@/lib/legalDefaults";

interface Props {
  slug: LegalSlug;
}

const LegalPage = ({ slug: forcedSlug }: Props) => {
  const params = useParams();
  const slug = (forcedSlug ?? (params.slug as LegalSlug)) as LegalSlug;
  const fallback = LEGAL_DOCS[slug];

  const [body, setBody] = useState<string>(fallback?.body ?? "");
  const [title, setTitle] = useState<string>(fallback?.title ?? "Legal");

  useSEO({
    title: `${title} – AI Coach Portal`,
    description: fallback?.description ?? "Legal information for AI Coach Portal.",
    canonical: `https://www.aicoachportal.com/${slug}`,
  });

  useEffect(() => {
    if (!fallback) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", `legal_${slug}`)
        .maybeSingle();
      if (!active) return;
      if (data?.value) setBody(data.value);
      const { data: t } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", `legal_${slug}_title`)
        .maybeSingle();
      if (!active) return;
      if (t?.value) setTitle(t.value);
    })();
    return () => {
      active = false;
    };
  }, [slug, fallback]);

  if (!fallback) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold">Page not found</h1>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 py-12 md:py-16">
        <header className="mb-8 border-b border-border pb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">{title}</h1>
        </header>
        <article className="prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground prose-a:text-primary">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
        </article>
      </main>
      <Footer />
    </div>
  );
};

export default LegalPage;
