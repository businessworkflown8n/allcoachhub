import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/useSEO";
import { Linkedin, Copy, Download, Sparkles, Loader2, ArrowRight } from "lucide-react";

interface CoachLite {
  user_id: string;
  full_name: string | null;
  slug: string | null;
  avatar_url: string | null;
  designation: string | null;
  company_name: string | null;
  linkedin_url: string | null;
}

const SITE = "https://www.aicoachportal.com";

const buildPost = (p: {
  jobRole: string;
  company: string;
  excitement: string;
  coachSlug: string;
  linkedin: string;
}) => `𝗜’𝗺 𝗱𝗲𝗱𝗶𝗰𝗮𝘁𝗶𝗻𝗴 𝗺𝘆 𝗲𝗻𝘁𝗶𝗿𝗲 𝘄𝗲𝗲𝗸𝗲𝗻𝗱 — 16+ 𝗵𝗼𝘂𝗿𝘀 — 𝘁𝗼 𝗺𝗮𝘀𝘁𝗲𝗿𝗶𝗻𝗴 𝗔𝗜 𝘁𝗼𝗼𝗹𝘀, 𝗮𝗻𝗱 𝗜’𝗺 𝗽𝘂𝘁𝘁𝗶𝗻𝗴 𝗶𝘁 𝗼𝘂𝘁 𝗵𝗲𝗿𝗲 𝘀𝗼 𝘆𝗼𝘂 𝗰𝗮𝗻 𝗵𝗼𝗹𝗱 𝗺𝗲 𝗮𝗰𝗰𝗼𝘂𝗻𝘁𝗮𝗯𝗹𝗲! 🎯

Want to join me in the AI revolution? Don’t miss out 👇
👉 ${SITE}/Ai-mastermind-learning/${p.coachSlug}?utm_source=linkedin&utm_medium=social&utm_campaign=ai_mastermind

I’ve just joined the AI Coach Portal – AI Mastermind Program 🚀

As a ${p.jobRole || "professional"}${p.company ? ` at ${p.company}` : ""}, I’ve realized the massive potential of AI in transforming how we work. That’s why I’m going all-in on this journey.

Here’s what I’ll be learning 👇
⭐ Generative AI for real-world execution
⚙️ AI Agents for automation & growth
🎨 AI tools for content, ads & scaling

𝗜’𝗺 𝗽𝗮𝗿𝘁𝗶𝗰𝘂𝗹𝗮𝗿𝗹𝘆 𝗲𝘅𝗰𝗶𝘁𝗲𝗱 𝗮𝗯𝗼𝘂𝘁:
👉 ${p.excitement || "Mastering AI tools to scale my growth"}

This is not just learning — this is execution mode 💡

𝗢𝗻𝗰𝗲 𝘁𝗵𝗶𝘀 𝗷𝗼𝘂𝗿𝗻𝗲𝘆 𝗸𝗶𝗰𝗸𝘀 𝗼𝗳𝗳, 𝗜’𝗹𝗹 𝗯𝗲 𝘀𝗵𝗮𝗿𝗶𝗻𝗴 𝗺𝘆 𝗿𝗲𝗮𝗹 𝗿𝗲𝘀𝘂𝗹𝘁𝘀.

Hold me accountable 🤝

#AI #GenerativeAI #AICoachPortal #BuildInPublic #AIForGrowth #Automation

🔗 Connect with me:
${p.linkedin || "[Add your LinkedIn URL]"}

cc: AI Coach Portal Team`;

// Load image as HTMLImageElement (CORS-safe)
const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
};

const AiMastermindLearning = () => {
  const { coachSlug = "" } = useParams();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [coach, setCoach] = useState<CoachLite | null>(null);
  const [loadingCoach, setLoadingCoach] = useState(true);
  const [profileImage, setProfileImage] = useState<string>("");
  const [fullName, setFullName] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [company, setCompany] = useState("");
  const [excitement, setExcitement] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [generated, setGenerated] = useState(false);
  const [postText, setPostText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string>("");

  useSEO({
    title: coach?.full_name
      ? `${coach.full_name} – AI Mastermind Pledge | AI Coach Portal`
      : "AI Mastermind Learning – Generate your LinkedIn pledge",
    description: "Generate your personalized AI Mastermind LinkedIn post and branded badge in seconds.",
    canonical: `${SITE}/Ai-mastermind-learning/${coachSlug}`,
  });

  useEffect(() => {
    (async () => {
      setLoadingCoach(true);
      // Try slug first, then fallback to user_id
      let { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, slug, avatar_url, designation, company_name, linkedin_url")
        .eq("slug", coachSlug)
        .maybeSingle();

      if (!data) {
        const fb = await supabase
          .from("profiles")
          .select("user_id, full_name, slug, avatar_url, designation, company_name, linkedin_url")
          .eq("user_id", coachSlug)
          .maybeSingle();
        data = fb.data;
      }

      if (data) {
        setCoach(data as CoachLite);
        setFullName(data.full_name || "");
        setJobRole(data.designation || "");
        setCompany(data.company_name || "");
        setProfileImage(data.avatar_url || "");
        setLinkedinUrl(data.linkedin_url || "");
      }
      setLoadingCoach(false);
    })();
  }, [coachSlug]);

  const log = async (action: string, extra: Partial<{ post_text: string; image_url: string }> = {}) => {
    if (!coach) return;
    const params = new URLSearchParams(window.location.search);
    await supabase.from("linkedin_post_generations").insert({
      coach_id: coach.user_id,
      coach_slug: coachSlug,
      visitor_name: fullName || null,
      visitor_role: jobRole || null,
      visitor_company: company || null,
      visitor_excitement: excitement || null,
      action,
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      ...extra,
    } as any);
  };

  const drawBadge = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return "";
    const W = 1080;
    const H = 1080;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    // Background gradient (dark + neon)
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#0B0F1A");
    grad.addColorStop(1, "#121826");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Neon glow circle backdrop
    const glow = ctx.createRadialGradient(W / 2, 380, 50, W / 2, 380, 480);
    glow.addColorStop(0, "rgba(190,255,80,0.25)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Top tag
    ctx.fillStyle = "#BEFF50";
    ctx.font = "bold 36px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("# AI MASTERMIND", W / 2, 110);

    // Profile circle
    const cx = W / 2;
    const cy = 380;
    const r = 180;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
    ctx.strokeStyle = "#BEFF50";
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    if (profileImage) {
      try {
        const img = await loadImage(profileImage);
        const size = r * 2;
        ctx.drawImage(img, cx - r, cy - r, size, size);
      } catch {
        ctx.fillStyle = "#1f2937";
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        ctx.fillStyle = "#BEFF50";
        ctx.font = "bold 140px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText((fullName[0] || "A").toUpperCase(), cx, cy);
      }
    } else {
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.fillStyle = "#BEFF50";
      ctx.font = "bold 140px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText((fullName[0] || "A").toUpperCase(), cx, cy);
    }
    ctx.restore();

    // Name
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.font = "bold 56px Inter, sans-serif";
    ctx.fillText(fullName || "Your Name", W / 2, 660);

    // Role + Company
    ctx.fillStyle = "#9CA3AF";
    ctx.font = "400 32px Inter, sans-serif";
    const roleLine = [jobRole, company].filter(Boolean).join(" • ") || "Coach";
    ctx.fillText(roleLine, W / 2, 710);

    // Footer pledge
    ctx.fillStyle = "#E5E7EB";
    ctx.font = "600 30px Inter, sans-serif";
    const lines = wrapText(
      ctx,
      "I am committing 16+ hours to master AI & build real-world systems.",
      900
    );
    let y = 820;
    for (const l of lines) {
      ctx.fillText(l, W / 2, y);
      y += 42;
    }

    // Brand footer
    ctx.fillStyle = "#BEFF50";
    ctx.font = "bold 28px Inter, sans-serif";
    ctx.fillText("aicoachportal.com", W / 2, 1010);

    const dataUrl = canvas.toDataURL("image/png");
    setImageDataUrl(dataUrl);
    return dataUrl;
  };

  const handleGenerate = async () => {
    if (!fullName || !jobRole) {
      toast({ title: "Add your name and role", variant: "destructive" });
      return;
    }
    setGenerating(true);
    const text = buildPost({
      jobRole,
      company,
      excitement,
      coachSlug,
      linkedin: linkedinUrl,
    });
    setPostText(text);
    const img = await drawBadge();
    setGenerated(true);
    setGenerating(false);
    log("generated", { post_text: text, image_url: img ? "data:image/png" : "" });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(postText);
    toast({ title: "Copied to clipboard" });
    log("copied");
  };

  const handleShare = () => {
    const url = `${SITE}/Ai-mastermind-learning/${coachSlug}?utm_source=linkedin&utm_medium=social&utm_campaign=ai_mastermind`;
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    // copy text as fallback so user can paste
    navigator.clipboard.writeText(postText).catch(() => {});
    window.open(shareUrl, "_blank", "noopener,noreferrer");
    log("shared");
  };

  const handleDownload = () => {
    if (!imageDataUrl) return;
    const a = document.createElement("a");
    a.href = imageDataUrl;
    a.download = `ai-mastermind-${coachSlug}.png`;
    a.click();
    log("downloaded");
  };

  if (loadingCoach) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!coach) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Coach not found</h1>
          <p className="text-muted-foreground mb-6">No coach matches this URL.</p>
          <Button asChild><Link to="/coaches">Browse Coaches</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">AI Mastermind Pledge</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-3">
            Join {coach.full_name}'s AI Mastermind Journey
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Create a personalized LinkedIn post + branded badge to publicly commit to mastering AI in 48 hours.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* LEFT: Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Avatar className="h-8 w-8"><AvatarImage src={profileImage} /><AvatarFallback>{(fullName[0] || "A").toUpperCase()}</AvatarFallback></Avatar>
                Your Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Profile Image URL</Label>
                <Input value={profileImage} onChange={(e) => setProfileImage(e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <Label>Full Name *</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Job Role *</Label>
                  <Input value={jobRole} onChange={(e) => setJobRole(e.target.value)} placeholder="Marketing Lead" />
                </div>
                <div>
                  <Label>Company</Label>
                  <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Inc." />
                </div>
              </div>
              <div>
                <Label>LinkedIn Profile URL</Label>
                <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/..." />
              </div>
              <div>
                <Label>What are you most excited about?</Label>
                <Textarea
                  value={excitement}
                  onChange={(e) => setExcitement(e.target.value)}
                  placeholder="Building AI agents that book demos for me on autopilot."
                  rows={4}
                />
              </div>
              <Button onClick={handleGenerate} disabled={generating} className="w-full" size="lg">
                {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate LinkedIn Post & Image
              </Button>
            </CardContent>
          </Card>

          {/* RIGHT: Output */}
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Generated Post</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {generated ? (
                  <>
                    <Textarea value={postText} onChange={(e) => setPostText(e.target.value)} rows={14} className="font-mono text-xs" />
                    <div className="flex gap-2 flex-wrap">
                      <Button onClick={handleShare} className="flex-1 min-w-[160px]">
                        <Linkedin className="h-4 w-4 mr-2" /> Post on LinkedIn
                      </Button>
                      <Button variant="outline" onClick={handleCopy}>
                        <Copy className="h-4 w-4 mr-2" /> Copy Text
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm py-12 text-center">Fill the form and click Generate to see your post here.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Branded Badge</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-lg overflow-hidden bg-muted/30 border border-border">
                  <canvas ref={canvasRef} className={`w-full h-auto ${generated ? "" : "hidden"}`} />
                  {!generated && (
                    <div className="aspect-square flex items-center justify-center text-muted-foreground text-sm">
                      Your badge will render here
                    </div>
                  )}
                </div>
                {generated && (
                  <Button variant="outline" onClick={handleDownload} className="w-full">
                    <Download className="h-4 w-4 mr-2" /> Download Image (1080×1080)
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Viral CTA */}
        <Card className="mt-10 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="py-8 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Want your own AI journey page?</h2>
            <p className="text-muted-foreground mb-4">Activate your personal AI Mastermind URL on AI Coach Portal.</p>
            <Button asChild size="lg">
              <Link to="/signup/coach">Activate Yours <ArrowRight className="h-4 w-4 ml-2" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AiMastermindLearning;
