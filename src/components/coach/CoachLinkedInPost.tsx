import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Linkedin, ExternalLink, Copy, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SITE = "https://www.aicoachportal.com";

const CoachLinkedInPost = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [slug, setSlug] = useState<string>("");
  const [stats, setStats] = useState({ generated: 0, copied: 0, shared: 0, downloaded: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("slug, user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      const s = profile?.slug || profile?.user_id || "";
      setSlug(s);

      const { data: events } = await supabase
        .from("linkedin_post_generations")
        .select("action")
        .eq("coach_id", user.id);
      const counts = { generated: 0, copied: 0, shared: 0, downloaded: 0 };
      (events || []).forEach((e: any) => {
        if (counts[e.action as keyof typeof counts] !== undefined) counts[e.action as keyof typeof counts]++;
      });
      setStats(counts);
    })();
  }, [user]);

  const url = slug ? `${SITE}/Ai-mastermind-learning/${slug}` : "";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Linkedin className="h-6 w-6 text-primary" /> LinkedIn Post Generator
        </h2>
        <p className="text-muted-foreground text-sm">
          Share your personal AI Mastermind page so visitors can publicly pledge — every share drives traffic back to you.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Your Public Pledge URL</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={url} readOnly />
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(url);
                toast({ title: "URL copied" });
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" /> Open
              </a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Share this URL on LinkedIn, WhatsApp, or your newsletter. Each visitor can generate their own AI Mastermind pledge post and badge — bringing eyeballs back to your profile.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Engagement Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Generated", value: stats.generated },
              { label: "Copied", value: stats.copied },
              { label: "Shared", value: stats.shared },
              { label: "Downloaded", value: stats.downloaded },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-border p-4 text-center bg-muted/20">
                <p className="text-3xl font-bold text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CoachLinkedInPost;
