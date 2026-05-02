import { useEffect, useRef, useState } from "react";
import { useParams, Link, useLocation, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useExternalLinkControl } from "@/hooks/useExternalLinkControl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSEO } from "@/hooks/useSEO";
import { Linkedin, Copy, Download, Sparkles, Loader2, ArrowRight, Upload } from "lucide-react";
import { compressImage, getDataUrlSizeKB } from "@/lib/imageCompress";
import { drawLinkedInBadge } from "@/lib/drawLinkedInBadge";

interface CoachLite {
  user_id: string;
  full_name: string | null;
  slug: string | null;
  avatar_url: string | null;
  job_title: string | null;
  company_name: string | null;
  linkedin_profile: string | null;
}

interface CourseLite {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  slug: string | null;
}

const SITE = "https://www.aicoachportal.com";

const commitmentByCategory = (category?: string | null) => {
  const c = (category || "").toLowerCase();
  if (c.includes("market")) return "to master AI-driven marketing & scale campaigns";
  if (c.includes("automat")) return "to build AI agents & automate workflows";
  if (c.includes("content")) return "to create high-performing AI content systems";
  if (c.includes("sales")) return "to close more deals using AI-powered sales systems";
  if (c.includes("design")) return "to craft world-class design with AI tools";
  if (c.includes("data") || c.includes("analy")) return "to turn raw data into AI-driven insights";
  return "to master AI and build real-world systems through this program";
};

const buildPost = (p: {
  jobRole: string;
  company: string;
  excitement: string;
  coachSlug: string;
  coachName: string;
  linkedin: string;
  courseName: string;
  courseTagline: string;
  category: string;
}) => `𝗜’𝗺 𝗴𝗼𝗶𝗻𝗴 𝗮𝗹𝗹-𝗶𝗻 𝗼𝗻 ${p.courseName} — 𝗮𝗻𝗱 𝗜’𝗺 𝗽𝘂𝘁𝘁𝗶𝗻𝗴 𝗶𝘁 𝗼𝘂𝘁 𝗵𝗲𝗿𝗲 𝘀𝗼 𝘆𝗼𝘂 𝗰𝗮𝗻 𝗵𝗼𝗹𝗱 𝗺𝗲 𝗮𝗰𝗰𝗼𝘂𝗻𝘁𝗮𝗯𝗹𝗲! 🎯

Want to join me? Don’t miss out 👇
👉 ${SITE}/Ai-mastermind-learning/${p.coachSlug}?utm_source=linkedin&utm_medium=social&utm_campaign=ai_mastermind

I’ve just joined ${p.courseName}${p.coachName ? ` by ${p.coachName}` : ""} on AICoachPortal 🚀
${p.courseTagline ? `\n${p.courseTagline}\n` : ""}
As a ${p.jobRole || "professional"}${p.company ? ` at ${p.company}` : ""}, I’ve realized the massive potential of AI in transforming how we work. That’s why I’m committing ${commitmentByCategory(p.category)}.

Here’s what I’ll be learning 👇
⭐ Generative AI for real-world execution
⚙️ AI Agents for automation & growth
🎨 AI tools for content, ads & scaling

𝗜’𝗺 𝗽𝗮𝗿𝘁𝗶𝗰𝘂𝗹𝗮𝗿𝗹𝘆 𝗲𝘅𝗰𝗶𝘁𝗲𝗱 𝗮𝗯𝗼𝘂𝘁:
👉 ${p.excitement || "Mastering AI tools to scale my growth"}

This is not just learning — this is execution mode 💡

Hold me accountable 🤝

#AI #GenerativeAI #AICoachPortal #BuildInPublic #AIForGrowth #Automation

🔗 Connect with me:
${p.linkedin || "[Add your LinkedIn URL]"}

cc: AI Coach Portal Team`;

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    // Only set crossOrigin for remote http(s) URLs; data: URLs don't need it
    // and setting it can cause silent failures on servers without CORS headers.
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
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
};

const tagFromCategory = (category?: string | null) => {
  const c = (category || "").toLowerCase();
  if (c.includes("market")) return "#AI MARKETING";
  if (c.includes("automat")) return "#AUTOMATION";
  if (c.includes("content")) return "#AI CONTENT";
  if (c.includes("sales")) return "#AI SALES";
  if (c.includes("design")) return "#AI DESIGN";
  if (c.includes("data") || c.includes("analy")) return "#AI DATA";
  return "#AI MASTERY";
};

const AiMastermindLearning = () => {
  const { coachSlug = "" } = useParams();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const linkControl = useExternalLinkControl("ai_mastermind_learning");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [coach, setCoach] = useState<CoachLite | null>(null);
  const [courses, setCourses] = useState<CourseLite[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const courseName = selectedCourse?.title || "AI Mastermind Program";
  const courseTagline =
    (selectedCourse?.description || "").split("\n")[0].slice(0, 80) || "";
  const courseCategory = selectedCourse?.category || "";

  useSEO({
    title: coach?.full_name
      ? `${coach.full_name} – ${courseName} | AI Coach Portal`
      : "AI Mastermind Learning – Generate your LinkedIn pledge",
    description: "Generate a personalized LinkedIn post + branded badge for the course you're joining.",
    canonical: `${SITE}/Ai-mastermind-learning/${coachSlug}`,
  });

  useEffect(() => {
    (async () => {
      setLoadingCoach(true);
      const cols = "user_id, full_name, slug, avatar_url, job_title, company_name, linkedin_profile";
      let { data } = await supabase
        .from("profiles")
        .select(cols)
        .eq("slug", coachSlug)
        .maybeSingle();

      if (!data) {
        const fb = await supabase
          .from("profiles")
          .select(cols)
          .eq("user_id", coachSlug)
          .maybeSingle();
        data = fb.data;
      }

      if (data) {
        const d = data as CoachLite;
        setCoach(d);
        setFullName(d.full_name || "");
        setJobRole(d.job_title || "");
        setCompany(d.company_name || "");
        setProfileImage(d.avatar_url || "");
        setLinkedinUrl(d.linkedin_profile || "");

        const { data: courseRows } = await supabase
          .from("courses")
          .select("id, title, description, category, slug")
          .eq("coach_id", d.user_id)
          .eq("is_published", true)
          .eq("approval_status", "approved")
          .order("created_at", { ascending: false });
        const list = (courseRows || []) as CourseLite[];
        setCourses(list);
        if (list[0]) setSelectedCourseId(list[0].id);
      }
      setLoadingCoach(false);
    })();
  }, [coachSlug]);

  // Track external link click (fires once per page load)
  useEffect(() => {
    if (linkControl.loading || authLoading) return;
    const params = new URLSearchParams(window.location.search);
    supabase.from("external_link_clicks").insert({
      feature_key: "ai_mastermind_learning",
      coach_slug: coachSlug,
      access_mode: linkControl.accessMode,
      was_authenticated: !!user,
      required_login: linkControl.enabled && linkControl.accessMode === "private",
      user_id: user?.id ?? null,
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
    } as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkControl.loading, authLoading]);

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
    const result = await drawLinkedInBadge(canvas, {
      fullName,
      jobRole,
      company,
      profileImage,
      courseName,
      courseTagline,
      coachName: coach?.full_name || "",
      tag: tagFromCategory(courseCategory),
      commitmentLine: `I am committing ${commitmentByCategory(courseCategory)}.`,
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
      coachName: coach?.full_name || "",
      linkedin: linkedinUrl,
      courseName,
      courseTagline,
      category: courseCategory,
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

  if (loadingCoach || linkControl.loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Access gating:
  // - External link OFF  → only logged-in users may access (internal use).
  // - External link ON + private → anonymous users redirected to login (return after).
  // - External link ON + public  → open to everyone.
  if (!linkControl.enabled && !user) {
    return <Navigate to={`/auth?mode=login&redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  if (linkControl.enabled && linkControl.accessMode === "private" && !user) {
    return <Navigate to={`/auth?mode=login&redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
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
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              {courseName}
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-3">
            Join {coach.full_name}'s {courseName}
          </h1>
          {courseTagline && (
            <p className="text-primary text-sm font-medium mb-2">{courseTagline}</p>
          )}
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Generate a personalized LinkedIn post + branded badge to publicly commit to this program.
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
              {courses.length > 0 && (
                <div>
                  <Label>Course</Label>
                  <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                    <SelectTrigger><SelectValue placeholder="Choose a course" /></SelectTrigger>
                    <SelectContent>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
                  Upload an image — auto-compressed under 100 KB. Recommended for best results (avoids CORS issues).
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

        <Card className="mt-10 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="py-8 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Want your own course landing page?</h2>
            <p className="text-muted-foreground mb-4">Activate your personal AI Coach Portal page and start enrolling learners today.</p>
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
