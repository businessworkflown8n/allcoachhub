import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/useSEO";
import { Linkedin, Copy, Download, Sparkles, Loader2, Lock, Briefcase, Upload } from "lucide-react";
import { compressImage, getDataUrlSizeKB } from "@/lib/imageCompress";

const SITE = "https://www.aicoachportal.com";
const PUBLIC_URL = `${SITE}/ai-jobs-news/linkedin-post`;

const buildPost = (p: { jobRole: string; company: string; excitement: string; linkedin: string }) =>
  `𝗜’𝗺 𝗱𝗲𝗱𝗶𝗰𝗮𝘁𝗶𝗻𝗴 𝗺𝘆 𝗲𝗻𝘁𝗶𝗿𝗲 𝘄𝗲𝗲𝗸𝗲𝗻𝗱 — 16+ 𝗵𝗼𝘂𝗿𝘀 — 𝘁𝗼 𝗺𝗮𝘀𝘁𝗲𝗿𝗶𝗻𝗴 𝗔𝗜 𝘁𝗼𝗼𝗹𝘀, 𝗮𝗻𝗱 𝗜’𝗺 𝗽𝘂𝘁𝘁𝗶𝗻𝗴 𝗶𝘁 𝗼𝘂𝘁 𝗵𝗲𝗿𝗲 𝘀𝗼 𝘆𝗼𝘂 𝗰𝗮𝗻 𝗵𝗼𝗹𝗱 𝗺𝗲 𝗮𝗰𝗰𝗼𝘂𝗻𝘁𝗮𝗯𝗹𝗲! 🎯

Want to join me in the AI revolution? Don’t miss out 👇
👉 ${PUBLIC_URL}?utm_source=linkedin&utm_medium=social&utm_campaign=ai_jobs_news

I’ve just joined the AI Coach Portal – AI Mastermind Program 🚀

As a ${p.jobRole || "professional"}${p.company ? ` at ${p.company}` : ""}, I’ve realized the massive potential of AI in transforming how we work. That’s why I’m going all-in on this journey.

Here’s what I’ll be learning 👇
⭐ Generative AI for real-world execution
⚙️ AI Agents for automation & growth
🎨 AI tools for content, ads & scaling

𝗜’𝗺 𝗽𝗮𝗿𝘁𝗶𝗰𝘂𝗹𝗮𝗿𝗹𝘆 𝗲𝘅𝗰𝗶𝘁𝗲𝗱 𝗮𝗯𝗼𝘂𝘁:
👉 ${p.excitement || "Mastering AI tools to scale my growth"}

This is not just learning — this is execution mode 💡

#AI #GenerativeAI #AICoachPortal #BuildInPublic #AIForGrowth #Automation #AIJobs

🔗 Connect with me:
${p.linkedin || "[Add your LinkedIn URL]"}

cc: AI Coach Portal Team`;

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    if (/^https?:\/\//i.test(src)) {
      img.crossOrigin = "anonymous";
    }
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
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
};

const AiJobsNewsLinkedInPost = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [checking, setChecking] = useState(true);
  const [enabled, setEnabled] = useState(false);

  const [profileImage, setProfileImage] = useState("");
  const [fullName, setFullName] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [company, setCompany] = useState("");
  const [excitement, setExcitement] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [generated, setGenerated] = useState(false);
  const [postText, setPostText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useSEO({
    title: "AI Jobs & News – LinkedIn Post Generator | AI Coach Portal",
    description: "Generate a personalized AI Mastermind LinkedIn post and a branded badge. Free for logged-in members.",
    canonical: PUBLIC_URL,
  });

  // Check feature toggle
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("external_link_controls")
        .select("is_enabled")
        .eq("feature_key", "ai_jobs_news_linkedin_post")
        .maybeSingle();
      setEnabled(!!data?.is_enabled);
      setChecking(false);
    })();
  }, []);

  // Prefill from logged-in profile
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, job_title, company_name, linkedin_profile")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setFullName(data.full_name || "");
        setProfileImage(data.avatar_url || "");
        setJobRole((data as any).job_title || "");
        setCompany(data.company_name || "");
        setLinkedinUrl((data as any).linkedin_profile || "");
      }
    })();
  }, [user]);

  const log = async (action: string) => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    await supabase.from("public_linkedin_post_generations").insert({
      user_id: user.id,
      action,
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
    });
  };

  const drawBadge = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return "";
    const W = 1080, H = 1080;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#0B0F1A"); grad.addColorStop(1, "#121826");
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);

    const glow = ctx.createRadialGradient(W / 2, 380, 50, W / 2, 380, 480);
    glow.addColorStop(0, "rgba(190,255,80,0.25)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#BEFF50";
    ctx.font = "bold 36px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("# AI JOBS & NEWS", W / 2, 110);

    const cx = W / 2, cy = 380, r = 180;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
    ctx.strokeStyle = "#BEFF50"; ctx.lineWidth = 6; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.closePath(); ctx.clip();

    if (profileImage) {
      try {
        const img = await loadImage(profileImage);
        ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
      } catch {
        ctx.fillStyle = "#1f2937"; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        ctx.fillStyle = "#BEFF50"; ctx.font = "bold 140px Inter, sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText((fullName[0] || "A").toUpperCase(), cx, cy);
      }
    } else {
      ctx.fillStyle = "#1f2937"; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.fillStyle = "#BEFF50"; ctx.font = "bold 140px Inter, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText((fullName[0] || "A").toUpperCase(), cx, cy);
    }
    ctx.restore();

    ctx.fillStyle = "#FFFFFF"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.font = "bold 56px Inter, sans-serif";
    ctx.fillText(fullName || "Your Name", W / 2, 660);

    ctx.fillStyle = "#9CA3AF"; ctx.font = "400 32px Inter, sans-serif";
    ctx.fillText([jobRole, company].filter(Boolean).join(" • ") || "Member", W / 2, 710);

    ctx.fillStyle = "#E5E7EB"; ctx.font = "600 30px Inter, sans-serif";
    const lines = wrapText(ctx, "I am committing 16+ hours to master AI & build real-world systems.", 900);
    let y = 820;
    for (const l of lines) { ctx.fillText(l, W / 2, y); y += 42; }

    ctx.fillStyle = "#BEFF50"; ctx.font = "bold 28px Inter, sans-serif";
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
    setPostText(buildPost({ jobRole, company, excitement, linkedin: linkedinUrl }));
    await drawBadge();
    setGenerated(true);
    setGenerating(false);
    log("generated");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(postText);
    toast({ title: "Copied to clipboard" });
    log("copied");
  };

  const handleShare = () => {
    const url = `${PUBLIC_URL}?utm_source=linkedin&utm_medium=social&utm_campaign=ai_jobs_news`;
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    navigator.clipboard.writeText(postText).catch(() => {});
    window.open(shareUrl, "_blank", "noopener,noreferrer");
    log("shared");
  };

  const handleDownload = () => {
    if (!imageDataUrl) return;
    const a = document.createElement("a");
    a.href = imageDataUrl;
    a.download = `ai-jobs-news-linkedin-${Date.now()}.png`;
    a.click();
    log("downloaded");
  };

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6 text-center">
        <div className="max-w-md">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Feature unavailable</h1>
          <p className="text-muted-foreground mb-6">
            The LinkedIn Post Generator is currently disabled. Please check back later.
          </p>
          <Button asChild><Link to="/">Go Home</Link></Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6 text-center">
        <div className="max-w-md">
          <Briefcase className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Login required</h1>
          <p className="text-muted-foreground mb-6">
            Please sign in to use the AI Jobs &amp; News LinkedIn Post Generator.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate(`/login?redirect=${encodeURIComponent("/ai-jobs-news/linkedin-post")}`)}>
              Login
            </Button>
            <Button variant="outline" onClick={() => navigate("/signup")}>Sign Up</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Briefcase className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">AI Jobs &amp; News</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-3">
            AI Mastermind LinkedIn Post Generator
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Create a personalized LinkedIn post + branded badge to publicly commit to mastering AI.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profileImage} />
                  <AvatarFallback>{(fullName[0] || "A").toUpperCase()}</AvatarFallback>
                </Avatar>
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
                <Textarea value={excitement} onChange={(e) => setExcitement(e.target.value)}
                  placeholder="Building AI agents that book demos for me on autopilot." rows={4} />
              </div>
              <Button onClick={handleGenerate} disabled={generating} className="w-full" size="lg">
                {generating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate LinkedIn Post &amp; Image
              </Button>
            </CardContent>
          </Card>

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
                  <p className="text-muted-foreground text-sm py-12 text-center">
                    Fill the form and click Generate to see your post here.
                  </p>
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
      </div>
    </div>
  );
};

export default AiJobsNewsLinkedInPost;
