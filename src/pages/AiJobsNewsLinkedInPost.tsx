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
import { drawLinkedInBadge } from "@/lib/drawLinkedInBadge";

const SITE = "https://www.aicoachportal.com";
const PUBLIC_URL = `${SITE}/ai-jobs-news/linkedin-post`;
const JOIN_URL = `${SITE}/?utm_source=linkedin&utm_medium=badge&utm_campaign=ai_mastermind`;

const buildPost = (p: { jobRole: string; company: string; excitement: string; linkedin: string }) =>
  `𝗜’𝘃𝗲 𝗷𝘂𝘀𝘁 𝘁𝗮𝗸𝗲𝗻 𝗮 𝗯𝗶𝗴 𝗱𝗲𝗰𝗶𝘀𝗶𝗼𝗻 — 𝗜’𝗺 𝗴𝗼𝗶𝗻𝗴 𝗮𝗹𝗹-𝗶𝗻 𝗼𝗻 𝗹𝗲𝗮𝗿𝗻𝗶𝗻𝗴 𝗔𝗜 & 𝗔𝘂𝘁𝗼𝗺𝗮𝘁𝗶𝗼𝗻. 🚀

𝗜’𝗺 𝗱𝗲𝗱𝗶𝗰𝗮𝘁𝗶𝗻𝗴 𝗺𝘆 𝗲𝗻𝘁𝗶𝗿𝗲 𝘄𝗲𝗲𝗸𝗲𝗻𝗱 — 16+ 𝗵𝗼𝘂𝗿𝘀 — 𝘁𝗼 𝗺𝗮𝘀𝘁𝗲𝗿𝗶𝗻𝗴 𝗔𝗜 𝘁𝗼𝗼𝗹𝘀, 𝗮𝗻𝗱 𝗜’𝗺 𝗽𝘂𝘁𝘁𝗶𝗻𝗴 𝗶𝘁 𝗼𝘂𝘁 𝗵𝗲𝗿𝗲 𝘀𝗼 𝘆𝗼𝘂 𝗰𝗮𝗻 𝗵𝗼𝗹𝗱 𝗺𝗲 𝗮𝗰𝗰𝗼𝘂𝗻𝘁𝗮𝗯𝗹𝗲! 🎯

As a ${p.jobRole || "professional"}${p.company ? ` at ${p.company}` : ""}, I’ve realized AI is no longer optional — it’s the single biggest leverage of this decade. So I’m starting my AI Mastermind journey with AI Coach Portal.

Here’s what I’ll be focusing on 👇
⭐ Generative AI for real-world execution
⚙️ AI Agents & workflow automation
🎨 AI tools for content, marketing & scaling

𝗪𝗵𝗮𝘁 𝗜’𝗺 𝗺𝗼𝘀𝘁 𝗲𝘅𝗰𝗶𝘁𝗲𝗱 𝗮𝗯𝗼𝘂𝘁:
👉 ${p.excitement || "Building AI systems that automate my growth on autopilot"}

If you’ve been thinking about starting too — this is your sign. Join me 👇
👉 ${JOIN_URL}

#AI #Automation #GenerativeAI #AICoachPortal #BuildInPublic #LearnInPublic #AIForGrowth

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
    const result = await drawLinkedInBadge(canvas, {
      fullName,
      jobRole,
      company,
      profileImage,
      courseName: "AI Mastermind Program",
      courseTagline: "AI Jobs & News Edition",
      tag: "#AI MASTERY",
      commitmentLine:
        "I am committing to mastering AI and building real-world systems through this program.",
      ctaLabel: "Join Now",
      ctaSub: "aicoachportal.com",
    });
    if (result.taintedFallback) {
      toast({
        title: "Profile image blocked by CORS",
        description: "Please upload your image to generate the badge.",
        variant: "destructive",
      });
      setProfileImage("");
      return "";
    }
    setImageDataUrl(result.dataUrl);
    return result.dataUrl;
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "Image too large (max 20MB)", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      setProfileImage(compressed);
      toast({
        title: "Image uploaded",
        description: `Compressed to ${getDataUrlSizeKB(compressed)} KB`,
      });
    } catch (err) {
      console.error(err);
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
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
                <Label>Profile Image</Label>
                <div className="flex gap-2">
                  <Input
                    value={profileImage.startsWith("data:") ? "(uploaded image)" : profileImage}
                    onChange={(e) => setProfileImage(e.target.value)}
                    placeholder="https://... or upload below"
                    readOnly={profileImage.startsWith("data:")}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUpload}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Upload an image — auto-compressed under 100 KB. Recommended (avoids CORS issues).
                </p>
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
