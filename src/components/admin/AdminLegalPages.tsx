import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LEGAL_DOCS, LEGAL_SLUGS, type LegalSlug } from "@/lib/legalDefaults";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { RotateCcw, Save } from "lucide-react";

const AdminLegalPages = () => {
  const [active, setActive] = useState<LegalSlug>("privacy-policy");
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [bodies, setBodies] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const keys = LEGAL_SLUGS.flatMap((s) => [`legal_${s}`, `legal_${s}_title`]);
      const { data } = await supabase
        .from("platform_settings")
        .select("key,value")
        .in("key", keys);
      const t: Record<string, string> = {};
      const b: Record<string, string> = {};
      for (const slug of LEGAL_SLUGS) {
        t[slug] = LEGAL_DOCS[slug].title;
        b[slug] = LEGAL_DOCS[slug].body;
      }
      data?.forEach((row: any) => {
        const m = row.key.match(/^legal_(.+?)(_title)?$/);
        if (!m) return;
        const slug = m[1] as LegalSlug;
        if (!LEGAL_SLUGS.includes(slug)) return;
        if (m[2]) t[slug] = row.value;
        else b[slug] = row.value;
      });
      setTitles(t);
      setBodies(b);
    })();
  }, []);

  const save = async (slug: LegalSlug) => {
    setSaving(true);
    const rows = [
      { key: `legal_${slug}`, value: bodies[slug] ?? "" },
      { key: `legal_${slug}_title`, value: titles[slug] ?? LEGAL_DOCS[slug].title },
    ];
    const { error } = await supabase
      .from("platform_settings")
      .upsert(rows, { onConflict: "key" });
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved", description: `${LEGAL_DOCS[slug].title} updated.` });
    }
  };

  const reset = (slug: LegalSlug) => {
    setBodies((b) => ({ ...b, [slug]: LEGAL_DOCS[slug].body }));
    setTitles((t) => ({ ...t, [slug]: LEGAL_DOCS[slug].title }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Legal Pages</h1>
        <p className="text-sm text-muted-foreground">
          Edit the content of Privacy Policy, Refund, Cancellation, Shipping, Terms, and Disclaimer pages. Supports Markdown.
        </p>
      </div>

      <Tabs value={active} onValueChange={(v) => setActive(v as LegalSlug)}>
        <TabsList className="flex flex-wrap h-auto">
          {LEGAL_SLUGS.map((s) => (
            <TabsTrigger key={s} value={s}>
              {LEGAL_DOCS[s].title}
            </TabsTrigger>
          ))}
        </TabsList>

        {LEGAL_SLUGS.map((slug) => (
          <TabsContent key={slug} value={slug} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Page Title</label>
              <Input
                value={titles[slug] ?? ""}
                onChange={(e) => setTitles({ ...titles, [slug]: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Content (Markdown)</label>
              <Textarea
                rows={28}
                className="font-mono text-xs"
                value={bodies[slug] ?? ""}
                onChange={(e) => setBodies({ ...bodies, [slug]: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => save(slug)} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" onClick={() => reset(slug)}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to default
              </Button>
              <a
                href={`/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-sm text-primary underline self-center"
              >
                View live page →
              </a>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default AdminLegalPages;
