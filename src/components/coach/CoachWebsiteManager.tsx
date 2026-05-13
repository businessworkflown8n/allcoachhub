import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Globe, Save, Send, Eye, Loader2, Upload, Palette, Plus, X, Trash2, Sparkles, Layout, ArrowUp, ArrowDown } from "lucide-react";
import CoachWebsiteLeads from "./CoachWebsiteLeads";
import TemplateGallery from "./website/TemplateGallery";
import SectionReorder, { DEFAULT_SECTION_ORDER, SectionItem } from "./website/SectionReorder";
import WebsiteSourceEditor, { SourceMode } from "./website/WebsiteSourceEditor";

interface ContentSections {
  stats: { value: string; label: string }[];
  usps: { title: string; desc: string }[];
  testimonials: { name: string; role: string; text: string; rating: number }[];
  faqs: { q: string; a: string }[];
  cta_headline: string;
  cta_subtext: string;
  demo_heading: string;
  demo_subtext: string;
}

const defaultContent: ContentSections = {
  stats: [
    { value: "500+", label: "Students Trained" },
    { value: "10+", label: "Courses Available" },
    { value: "3+", label: "Years Experience" },
    { value: "95%", label: "Success Rate" },
  ],
  usps: [
    { title: "Industry Expert Coaches", desc: "Learn from professionals with real-world experience." },
    { title: "Live + Recorded Sessions", desc: "Attend live or revisit recordings at your pace." },
    { title: "Hands-On Projects", desc: "Apply skills with practical, real-world projects." },
    { title: "Career Support", desc: "Resume reviews, interview prep, and job placement." },
    { title: "Certification", desc: "Earn recognized certificates on completion." },
    { title: "Lifetime Access", desc: "Access course materials anytime, forever." },
  ],
  testimonials: [
    { name: "Raj S.", role: "Data Analyst", text: "This program completely changed my career trajectory.", rating: 5 },
    { name: "Priya M.", role: "Marketing Manager", text: "The coach was extremely knowledgeable. Best investment I've made.", rating: 5 },
    { name: "Amit K.", role: "Software Engineer", text: "Practical and well-structured. I landed a new role within 2 months.", rating: 5 },
  ],
  faqs: [
    { q: "What is the course duration?", a: "Course durations vary by program. Each course page lists the total hours." },
    { q: "Will I get a certificate?", a: "Yes, you will receive a certificate of completion upon finishing the course." },
    { q: "Are the sessions live or recorded?", a: "We offer both live sessions and recorded content." },
    { q: "Is there placement support?", a: "Yes, we provide resume reviews, mock interviews, and career guidance." },
    { q: "What is the refund policy?", a: "We offer a 7-day satisfaction guarantee with full refund." },
  ],
  cta_headline: "Start Your Learning Journey Today",
  cta_subtext: "Don't wait — take the first step toward your new career.",
  demo_heading: "Book a Free Demo",
  demo_subtext: "Experience our teaching style firsthand",
};

interface WebsiteData {
  id?: string;
  institute_name: string;
  slug: string;
  tagline: string;
  description: string;
  logo_url: string;
  banner_url: string;
  banner_urls: string[];
  theme_color: string;
  video_url: string;
  about_text: string;
  social_links: Record<string, string>;
  show_courses: boolean;
  show_testimonials: boolean;
  show_about: boolean;
  show_contact: boolean;
  show_video: boolean;
  show_gallery: boolean;
  meta_title: string;
  meta_description: string;
  status: string;
  is_live: boolean;
  admin_note: string;
  content_sections: ContentSections;
  hero_variant: string;
  template_id: string | null;
  header_config: {
    menu_items?: { label: string; href: string }[];
    cta_label?: string;
    cta_href?: string;
    whatsapp_number?: string;
    sticky?: boolean;
    transparent?: boolean;
  };
  section_order: SectionItem[];
  source_mode: SourceMode;
  external_url: string;
  custom_html: string;
  github_repo_url: string;
}

const defaultData: WebsiteData = {
  institute_name: "", slug: "", tagline: "", description: "",
  logo_url: "", banner_url: "", banner_urls: [],
  theme_color: "#6366f1", video_url: "", about_text: "",
  social_links: { linkedin: "", twitter: "", youtube: "", instagram: "" },
  show_courses: true, show_testimonials: true, show_about: true,
  show_contact: false, show_video: false, show_gallery: false,
  meta_title: "", meta_description: "", status: "draft", is_live: false, admin_note: "",
  content_sections: defaultContent,
  hero_variant: "classic",
  template_id: null,
  header_config: {
    menu_items: [
      { label: "Home", href: "#top" },
      { label: "About", href: "#cw-about" },
      { label: "Courses", href: "#cw-courses" },
      { label: "Testimonials", href: "#cw-testimonials" },
      { label: "FAQ", href: "#cw-faq" },
      { label: "Contact", href: "#cw-demo" },
    ],
    cta_label: "Book Free Demo",
    cta_href: "#cw-demo",
    whatsapp_number: "",
    sticky: true,
    transparent: false,
  },
  section_order: DEFAULT_SECTION_ORDER,
  source_mode: "builder",
  external_url: "",
  custom_html: "",
  github_repo_url: "",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-yellow-500/20 text-yellow-400",
  approved: "bg-green-500/20 text-green-400",
  rejected: "bg-destructive/20 text-destructive",
};

const MAX_LOGO_KB = 200;
const MAX_BANNER_KB = 500;

const CoachWebsiteManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<WebsiteData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exists, setExists] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [leadCount, setLeadCount] = useState(0);
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState(false);

  const applyTemplate = (tpl: any) => {
    const cs = tpl.content_sections || {};
    setData((p) => ({
      ...p,
      template_id: tpl.id,
      theme_color: tpl.theme_color || p.theme_color,
      hero_variant: tpl.hero_variant || "gradient",
      content_sections: {
        ...p.content_sections,
        ...cs,
        stats: cs.stats || p.content_sections.stats,
        usps: cs.usps || p.content_sections.usps,
        testimonials: cs.testimonials || p.content_sections.testimonials,
        faqs: cs.faqs || p.content_sections.faqs,
      },
      header_config: { ...p.header_config, ...(tpl.header_config || {}) },
      section_order: Array.isArray(tpl.section_order) && tpl.section_order.length > 0
        ? tpl.section_order
        : p.section_order,
    }));
    setTemplateGalleryOpen(false);
    toast({ title: `Template "${tpl.name}" applied`, description: "Click Save Draft to keep these changes." });
  };

  const saveAsTemplate = async () => {
    if (!user) return;
    const name = window.prompt("Name your template", `${data.institute_name || "My"} Template`);
    if (!name) return;
    const category = window.prompt("Category (e.g. Coaching, Fitness, Consulting)", "My Templates") || "My Templates";
    const { error } = await supabase.from("coach_website_templates" as any).insert({
      name,
      category,
      description: `Saved from ${data.institute_name || "my website"}`,
      theme_color: data.theme_color,
      hero_variant: data.hero_variant,
      layout_variant: "classic",
      content_sections: data.content_sections as any,
      header_config: data.header_config as any,
      section_order: data.section_order as any,
      is_premium: false,
      is_published: false,
      created_by: user.id,
    });
    if (error) {
      toast({ title: "Could not save template", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Template saved", description: "Find it in Browse Templates → My Templates." });
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: website } = await supabase
        .from("coach_websites").select("*").eq("coach_id", user.id).maybeSingle();
      if (website) {
        const cs = (website.content_sections as any) || {};
        setData({
          id: website.id,
          institute_name: website.institute_name || "",
          slug: website.slug || "",
          tagline: website.tagline || "",
          description: website.description || "",
          logo_url: website.logo_url || "",
          banner_url: website.banner_url || "",
          banner_urls: (website as any).banner_urls || [],
          theme_color: website.theme_color || "#6366f1",
          video_url: website.video_url || "",
          about_text: website.about_text || "",
          social_links: (website.social_links as Record<string, string>) || defaultData.social_links,
          show_courses: website.show_courses ?? true,
          show_testimonials: website.show_testimonials ?? true,
          show_about: website.show_about ?? true,
          show_contact: website.show_contact ?? false,
          show_video: website.show_video ?? false,
          show_gallery: website.show_gallery ?? false,
          meta_title: website.meta_title || "",
          meta_description: website.meta_description || "",
          status: website.status || "draft",
          is_live: website.is_live ?? false,
          admin_note: website.admin_note || "",
          content_sections: {
            stats: cs.stats || defaultContent.stats,
            usps: cs.usps || defaultContent.usps,
            testimonials: cs.testimonials || defaultContent.testimonials,
            faqs: cs.faqs || defaultContent.faqs,
            cta_headline: cs.cta_headline || defaultContent.cta_headline,
            cta_subtext: cs.cta_subtext || defaultContent.cta_subtext,
            demo_heading: cs.demo_heading || defaultContent.demo_heading,
            demo_subtext: cs.demo_subtext || defaultContent.demo_subtext,
          },
          hero_variant: (website as any).hero_variant || "classic",
          template_id: (website as any).template_id || null,
          header_config: { ...defaultData.header_config, ...((website as any).header_config || {}) },
          section_order: Array.isArray((website as any).section_order) && (website as any).section_order.length > 0
            ? (website as any).section_order as SectionItem[]
            : DEFAULT_SECTION_ORDER,
          source_mode: ((website as any).source_mode as SourceMode) || "builder",
          external_url: (website as any).external_url || "",
          custom_html: (website as any).custom_html || "",
          github_repo_url: (website as any).github_repo_url || "",
        });
        setExists(true);
        // Fetch lead count
        const { count } = await supabase
          .from("chatbot_leads")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);
        setLeadCount(count || 0);
      } else {
        const { data: profile } = await supabase.from("profiles").select("full_name, company_name").eq("user_id", user.id).single();
        if (profile) {
          const name = profile.company_name || profile.full_name || "";
          setData((p) => ({ ...p, institute_name: name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") }));
        }
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSlugChange = (val: string) => {
    setData((p) => ({ ...p, slug: val.toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/--+/g, "-") }));
  };

  const handleUpload = async (type: string, file: File) => {
    if (!user) return;
    const maxKB = type === "logo" ? MAX_LOGO_KB : MAX_BANNER_KB;
    if (file.size > maxKB * 1024) {
      toast({ title: `File too large`, description: `Maximum size is ${maxKB}KB. Your file is ${Math.round(file.size / 1024)}KB.`, variant: "destructive" });
      return;
    }
    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Invalid format", description: "Please upload JPG, PNG, or WebP images only.", variant: "destructive" });
      return;
    }
    setUploading(type);
    const ext = file.name.split(".").pop();
    const path = `coach-websites/${user.id}/${type}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } else {
      const { data: urlData } = supabase.storage.from("logos").getPublicUrl(path);
      if (type === "logo") {
        setData((p) => ({ ...p, logo_url: urlData.publicUrl }));
      } else if (type.startsWith("banner")) {
        setData((p) => {
          const urls = [...p.banner_urls, urlData.publicUrl].slice(0, 3);
          return { ...p, banner_urls: urls, banner_url: urls[0] || "" };
        });
      }
      toast({ title: `${type === "logo" ? "Logo" : "Banner"} uploaded successfully` });
    }
    setUploading(null);
  };

  const removeBanner = (index: number) => {
    setData((p) => {
      const urls = p.banner_urls.filter((_, i) => i !== index);
      return { ...p, banner_urls: urls, banner_url: urls[0] || "" };
    });
  };

  const updateCS = (key: keyof ContentSections, value: any) => {
    setData((p) => ({ ...p, content_sections: { ...p.content_sections, [key]: value } }));
  };

  const completionPercent = useCallback(() => {
    const fields = [data.institute_name, data.slug, data.tagline, data.description, data.about_text, data.logo_url, data.banner_urls.length > 0 ? "yes" : "", data.meta_title, data.meta_description];
    return Math.round((fields.filter((f) => f && String(f).trim() !== "").length / fields.length) * 100);
  }, [data]);

  const saveDraft = async () => {
    if (!user || !data.slug || !data.institute_name) {
      toast({ title: "Please fill institute name and URL slug", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: any = {
      coach_id: user.id, institute_name: data.institute_name, slug: data.slug,
      tagline: data.tagline || null, description: data.description || null,
      logo_url: data.logo_url || null, banner_url: data.banner_urls[0] || data.banner_url || null,
      banner_urls: data.banner_urls, theme_color: data.theme_color || "#6366f1",
      video_url: data.video_url || null, about_text: data.about_text || null,
      social_links: data.social_links,
      show_courses: data.section_order.find((s) => s.id === "courses")?.visible ?? data.show_courses,
      show_testimonials: data.section_order.find((s) => s.id === "testimonials")?.visible ?? data.show_testimonials,
      show_about: data.section_order.find((s) => s.id === "about")?.visible ?? data.show_about,
      show_contact: data.show_contact,
      show_video: data.section_order.find((s) => s.id === "video")?.visible ?? data.show_video,
      show_gallery: data.show_gallery, meta_title: data.meta_title || null,
      meta_description: data.meta_description || null,
      content_sections: data.content_sections,
      hero_variant: data.hero_variant || "classic",
      template_id: data.template_id,
      header_config: data.header_config,
      section_order: data.section_order,
      source_mode: data.source_mode,
      external_url: data.external_url || null,
      custom_html: data.custom_html || null,
      github_repo_url: data.github_repo_url || null,
      status: data.status === "rejected" ? "draft" : data.status,
      updated_at: new Date().toISOString(),
    };
    let error;
    if (exists && data.id) {
      ({ error } = await supabase.from("coach_websites").update(payload).eq("id", data.id));
    } else {
      const { data: ins, error: ie } = await supabase.from("coach_websites").insert(payload).select().single();
      error = ie;
      if (ins) { setData((p) => ({ ...p, id: ins.id })); setExists(true); }
    }
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    } else {
      if (data.status === "rejected") setData((p) => ({ ...p, status: "draft" }));
      toast({ title: "Draft saved successfully" });
    }
    setSaving(false);
  };

  const submitForApproval = async () => {
    await saveDraft();
    if (!data.id && !exists) return;
    const { error } = await supabase.from("coach_websites").update({ status: "pending", updated_at: new Date().toISOString() }).eq("coach_id", user!.id);
    if (!error) {
      setData((p) => ({ ...p, status: "pending" }));
      toast({ title: "Submitted for approval", description: "Your website is under review by admin." });
    }
  };

  const isLocked = data.status === "pending";

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const cs = data.content_sections;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2"><Globe className="h-5 w-5 text-primary" /> My Website</h2>
          <p className="text-sm text-muted-foreground mt-1">Create your public institute landing page</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={STATUS_COLORS[data.status] || ""}>{data.status.charAt(0).toUpperCase() + data.status.slice(1)}</Badge>
          {data.status === "approved" && data.is_live && (
            <a href={`/coach-website/${data.slug}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm"><Eye className="h-4 w-4 mr-1" /> View Live</Button>
            </a>
          )}
        </div>
      </div>

      <Card><CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Website Completion</span>
          <span className="text-sm font-bold text-primary">{completionPercent()}%</span>
        </div>
        <Progress value={completionPercent()} className="h-2" />
      </CardContent></Card>

      {exists && (
        <Card className="border-primary/30">
          <CardContent className="pt-4 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Send className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Demo Leads Captured</p>
                <p className="text-xs text-muted-foreground">From "Book Free Demo" form on your landing page</p>
              </div>
            </div>
            <span className="text-2xl font-bold text-primary">{leadCount}</span>
          </CardContent>
        </Card>
      )}

      {exists && <CoachWebsiteLeads />}

      {data.admin_note && (data.status === "rejected" || data.status === "draft") && (
        <Card className="border-destructive/50"><CardContent className="pt-4 pb-4">
          <p className="text-sm font-medium text-destructive">Admin Feedback:</p>
          <p className="text-sm text-muted-foreground mt-1">{data.admin_note}</p>
        </CardContent></Card>
      )}

      {isLocked && (
        <Card className="border-yellow-500/50"><CardContent className="pt-4 pb-4 text-center">
          <p className="text-sm text-yellow-400 font-medium">🔒 Your website is under review. Editing is locked.</p>
        </CardContent></Card>
      )}

      <div className={`space-y-6 ${isLocked ? "opacity-60 pointer-events-none" : ""}`}>
        {/* Website Source */}
        <WebsiteSourceEditor
          sourceMode={data.source_mode}
          externalUrl={data.external_url}
          customHtml={data.custom_html}
          githubRepoUrl={data.github_repo_url}
          onChange={(patch) => setData((p) => ({ ...p, ...patch }))}
        />

        {/* Premium Templates */}
        <Card className={`border-primary/40 bg-gradient-to-br from-primary/5 to-transparent ${data.source_mode !== "builder" ? "opacity-50 pointer-events-none" : ""}`}>
          <CardContent className="pt-5 pb-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Premium Website Templates</p>
                <p className="text-xs text-muted-foreground">Pick a high-converting design for your niche. 10+ premium layouts.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={saveAsTemplate} className="font-semibold">
                <Save className="h-4 w-4 mr-2" /> Save as my template
              </Button>
              <Button onClick={() => setTemplateGalleryOpen(true)} className="font-semibold">
                <Layout className="h-4 w-4 mr-2" /> Browse Templates
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Header & Menu */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Layout className="h-4 w-4" /> Header & Navigation Menu</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <p className="text-xs text-muted-foreground">Your coach website uses its own custom header — the platform navbar is hidden. Customize the menu, primary CTA, and behavior below.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hero Style</Label>
                <select
                  value={data.hero_variant}
                  onChange={(e) => setData((p) => ({ ...p, hero_variant: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="classic">Classic — soft glow</option>
                  <option value="gradient">Gradient — premium mesh</option>
                  <option value="particle">Particle — animated</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>WhatsApp Number (with country code)</Label>
                <Input
                  value={data.header_config.whatsapp_number || ""}
                  onChange={(e) => setData((p) => ({ ...p, header_config: { ...p.header_config, whatsapp_number: e.target.value } }))}
                  placeholder="+919876543210"
                />
              </div>
              <div className="space-y-2">
                <Label>Primary CTA Label</Label>
                <Input
                  value={data.header_config.cta_label || ""}
                  onChange={(e) => setData((p) => ({ ...p, header_config: { ...p.header_config, cta_label: e.target.value } }))}
                  placeholder="Book Free Demo"
                />
              </div>
              <div className="space-y-2">
                <Label>CTA Target (anchor or URL)</Label>
                <Input
                  value={data.header_config.cta_href || ""}
                  onChange={(e) => setData((p) => ({ ...p, header_config: { ...p.header_config, cta_href: e.target.value } }))}
                  placeholder="#cw-demo"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Sticky Header</p>
                  <p className="text-xs text-muted-foreground">Stay visible on scroll</p>
                </div>
                <Switch
                  checked={data.header_config.sticky !== false}
                  onCheckedChange={(v) => setData((p) => ({ ...p, header_config: { ...p.header_config, sticky: v } }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Transparent at Top</p>
                  <p className="text-xs text-muted-foreground">Glass effect over hero</p>
                </div>
                <Switch
                  checked={!!data.header_config.transparent}
                  onCheckedChange={(v) => setData((p) => ({ ...p, header_config: { ...p.header_config, transparent: v } }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Menu Items</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setData((p) => ({
                      ...p,
                      header_config: {
                        ...p.header_config,
                        menu_items: [...(p.header_config.menu_items || []), { label: "New Link", href: "#top" }],
                      },
                    }))
                  }
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {(data.header_config.menu_items || []).map((mi, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={mi.label}
                      onChange={(e) => {
                        const items = [...(data.header_config.menu_items || [])];
                        items[idx] = { ...items[idx], label: e.target.value };
                        setData((p) => ({ ...p, header_config: { ...p.header_config, menu_items: items } }));
                      }}
                      placeholder="Label"
                      className="flex-1"
                    />
                    <Input
                      value={mi.href}
                      onChange={(e) => {
                        const items = [...(data.header_config.menu_items || [])];
                        items[idx] = { ...items[idx], href: e.target.value };
                        setData((p) => ({ ...p, header_config: { ...p.header_config, menu_items: items } }));
                      }}
                      placeholder="#cw-courses or https://..."
                      className="flex-1"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        const items = [...(data.header_config.menu_items || [])];
                        if (idx > 0) { [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]];
                          setData((p) => ({ ...p, header_config: { ...p.header_config, menu_items: items } })); }
                      }}
                    ><ArrowUp className="h-4 w-4" /></Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        const items = [...(data.header_config.menu_items || [])];
                        if (idx < items.length - 1) { [items[idx + 1], items[idx]] = [items[idx], items[idx + 1]];
                          setData((p) => ({ ...p, header_config: { ...p.header_config, menu_items: items } })); }
                      }}
                    ><ArrowDown className="h-4 w-4" /></Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        const items = (data.header_config.menu_items || []).filter((_, i) => i !== idx);
                        setData((p) => ({ ...p, header_config: { ...p.header_config, menu_items: items } }));
                      }}
                    ><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">Tip: use <code>#cw-about</code>, <code>#cw-courses</code>, <code>#cw-testimonials</code>, <code>#cw-faq</code>, <code>#cw-demo</code>, <code>#top</code> for in-page anchors.</p>
            </div>
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Institute Name *</Label>
                <Input value={data.institute_name} onChange={(e) => setData((p) => ({ ...p, institute_name: e.target.value }))} placeholder="My AI Academy" />
              </div>
              <div className="space-y-2">
                <Label>URL Slug *</Label>
                <Input value={data.slug} onChange={(e) => handleSlugChange(e.target.value)} placeholder="my-ai-academy" />
                <p className="text-xs text-muted-foreground">aicoachportal.com/coach-website/{data.slug || "your-slug"}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tagline</Label>
              <Input value={data.tagline} onChange={(e) => setData((p) => ({ ...p, tagline: e.target.value }))} placeholder="Empowering through AI education" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={data.description} onChange={(e) => setData((p) => ({ ...p, description: e.target.value }))} placeholder="Tell visitors about your institute..." rows={4} />
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Palette className="h-4 w-4" /> Branding</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {/* Logo */}
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-3">
                {data.logo_url && <img src={data.logo_url} alt="Logo" className="h-14 w-14 rounded-lg object-cover border border-border" />}
                <label className="cursor-pointer">
                  <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload("logo", e.target.files[0])} />
                  <Button variant="outline" size="sm" asChild>
                    <span>{uploading === "logo" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}{uploading === "logo" ? "Uploading..." : "Upload Logo"}</span>
                  </Button>
                </label>
                {data.logo_url && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setData((p) => ({ ...p, logo_url: "" }))}><Trash2 className="h-4 w-4" /></Button>}
              </div>
              <p className="text-xs text-muted-foreground">JPG, PNG or WebP • Max {MAX_LOGO_KB}KB • Recommended: 200×200px square</p>
            </div>

            {/* Banners */}
            <div className="space-y-2">
              <Label>Cover Banners (Max 3 — displayed as slider)</Label>
              <div className="flex flex-wrap gap-3">
                {data.banner_urls.map((url, i) => (
                  <div key={i} className="relative group">
                    <img src={url} alt={`Banner ${i + 1}`} className="h-20 w-40 rounded-lg object-cover border border-border" />
                    <button onClick={() => removeBanner(i)} className="absolute -top-2 -right-2 rounded-full bg-destructive text-destructive-foreground h-5 w-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-3 w-3" />
                    </button>
                    <span className="absolute bottom-1 left-1 text-[10px] bg-background/80 px-1 rounded text-muted-foreground">#{i + 1}</span>
                  </div>
                ))}
                {data.banner_urls.length < 3 && (
                  <label className="cursor-pointer flex items-center justify-center h-20 w-40 rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors">
                    <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload("banner", e.target.files[0])} />
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      {uploading?.startsWith("banner") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      <span className="text-[10px]">Add Banner</span>
                    </div>
                  </label>
                )}
              </div>
              <p className="text-xs text-muted-foreground">JPG, PNG or WebP • Max {MAX_BANNER_KB}KB each • Recommended: 1920×600px landscape</p>
            </div>

            {/* Theme Color */}
            <div className="space-y-2">
              <Label>Theme Color</Label>
              <div className="flex items-center gap-3">
                <input type="color" value={data.theme_color} onChange={(e) => setData((p) => ({ ...p, theme_color: e.target.value }))} className="h-10 w-10 cursor-pointer rounded border border-border" />
                <Input value={data.theme_color} onChange={(e) => setData((p) => ({ ...p, theme_color: e.target.value }))} className="max-w-[140px]" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section Order & Visibility (Drag & Drop) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Layout className="h-4 w-4" /> Page Sections — Drag to Reorder
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SectionReorder
              value={data.section_order}
              onChange={(next) => setData((p) => ({ ...p, section_order: next }))}
            />
            {data.section_order.find((s) => s.id === "about")?.visible && (
              <div className="space-y-2 pt-2 border-t border-border">
                <Label>About Us Content</Label>
                <Textarea value={data.about_text} onChange={(e) => setData((p) => ({ ...p, about_text: e.target.value }))} rows={4} placeholder="Write about your institute..." />
              </div>
            )}
            {data.section_order.find((s) => s.id === "video")?.visible && (
              <div className="space-y-2 pt-2 border-t border-border">
                <Label>Intro Video (YouTube URL)</Label>
                <Input value={data.video_url} onChange={(e) => setData((p) => ({ ...p, video_url: e.target.value }))} placeholder="https://youtube.com/watch?v=..." />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Editor */}
        <Card>
          <CardHeader><CardTitle className="text-base">Stats / Achievements</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {cs.stats.map((s, i) => (
              <div key={i} className="grid grid-cols-[100px_1fr_auto] gap-2 items-center">
                <Input value={s.value} onChange={(e) => { const a = [...cs.stats]; a[i] = { ...a[i], value: e.target.value }; updateCS("stats", a); }} placeholder="500+" className="text-sm" />
                <Input value={s.label} onChange={(e) => { const a = [...cs.stats]; a[i] = { ...a[i], label: e.target.value }; updateCS("stats", a); }} placeholder="Students Trained" className="text-sm" />
                {cs.stats.length > 1 && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => updateCS("stats", cs.stats.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>}
              </div>
            ))}
            {cs.stats.length < 6 && <Button variant="outline" size="sm" onClick={() => updateCS("stats", [...cs.stats, { value: "", label: "" }])}><Plus className="h-3.5 w-3.5 mr-1" /> Add Stat</Button>}
          </CardContent>
        </Card>

        {/* USP Editor */}
        <Card>
          <CardHeader><CardTitle className="text-base">Why Choose Us (USPs)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {cs.usps.map((u, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
                <Input value={u.title} onChange={(e) => { const a = [...cs.usps]; a[i] = { ...a[i], title: e.target.value }; updateCS("usps", a); }} placeholder="Feature title" className="text-sm" />
                <Input value={u.desc} onChange={(e) => { const a = [...cs.usps]; a[i] = { ...a[i], desc: e.target.value }; updateCS("usps", a); }} placeholder="Short description" className="text-sm" />
                {cs.usps.length > 1 && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => updateCS("usps", cs.usps.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>}
              </div>
            ))}
            {cs.usps.length < 8 && <Button variant="outline" size="sm" onClick={() => updateCS("usps", [...cs.usps, { title: "", desc: "" }])}><Plus className="h-3.5 w-3.5 mr-1" /> Add USP</Button>}
          </CardContent>
        </Card>

        {/* Testimonials Editor */}
        {data.show_testimonials && (
          <Card>
            <CardHeader><CardTitle className="text-base">Testimonials</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {cs.testimonials.map((t, i) => (
                <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={t.name} onChange={(e) => { const a = [...cs.testimonials]; a[i] = { ...a[i], name: e.target.value }; updateCS("testimonials", a); }} placeholder="Student name" className="text-sm" />
                    <Input value={t.role} onChange={(e) => { const a = [...cs.testimonials]; a[i] = { ...a[i], role: e.target.value }; updateCS("testimonials", a); }} placeholder="Role / Designation" className="text-sm" />
                  </div>
                  <Textarea value={t.text} onChange={(e) => { const a = [...cs.testimonials]; a[i] = { ...a[i], text: e.target.value }; updateCS("testimonials", a); }} placeholder="Testimonial text..." rows={2} className="text-sm" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Rating:</Label>
                      <select value={t.rating} onChange={(e) => { const a = [...cs.testimonials]; a[i] = { ...a[i], rating: Number(e.target.value) }; updateCS("testimonials", a); }} className="rounded border border-input bg-background px-2 py-1 text-xs">
                        {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} Stars</option>)}
                      </select>
                    </div>
                    {cs.testimonials.length > 1 && <Button variant="ghost" size="sm" className="text-destructive h-7 text-xs" onClick={() => updateCS("testimonials", cs.testimonials.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3 mr-1" /> Remove</Button>}
                  </div>
                </div>
              ))}
              {cs.testimonials.length < 10 && <Button variant="outline" size="sm" onClick={() => updateCS("testimonials", [...cs.testimonials, { name: "", role: "", text: "", rating: 5 }])}><Plus className="h-3.5 w-3.5 mr-1" /> Add Testimonial</Button>}
            </CardContent>
          </Card>
        )}

        {/* FAQ Editor */}
        <Card>
          <CardHeader><CardTitle className="text-base">FAQs</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {cs.faqs.map((f, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
                <Input value={f.q} onChange={(e) => { const a = [...cs.faqs]; a[i] = { ...a[i], q: e.target.value }; updateCS("faqs", a); }} placeholder="Question" className="text-sm" />
                <Input value={f.a} onChange={(e) => { const a = [...cs.faqs]; a[i] = { ...a[i], a: e.target.value }; updateCS("faqs", a); }} placeholder="Answer" className="text-sm" />
                {cs.faqs.length > 1 && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => updateCS("faqs", cs.faqs.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>}
              </div>
            ))}
            {cs.faqs.length < 12 && <Button variant="outline" size="sm" onClick={() => updateCS("faqs", [...cs.faqs, { q: "", a: "" }])}><Plus className="h-3.5 w-3.5 mr-1" /> Add FAQ</Button>}
          </CardContent>
        </Card>

        {/* CTA & Demo Text */}
        <Card>
          <CardHeader><CardTitle className="text-base">CTA & Demo Section Text</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Final CTA Headline</Label>
                <Input value={cs.cta_headline} onChange={(e) => updateCS("cta_headline", e.target.value)} placeholder="Start Your Learning Journey Today" />
              </div>
              <div className="space-y-2">
                <Label>Final CTA Subtext</Label>
                <Input value={cs.cta_subtext} onChange={(e) => updateCS("cta_subtext", e.target.value)} placeholder="Take the first step..." />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Demo Form Heading</Label>
                <Input value={cs.demo_heading} onChange={(e) => updateCS("demo_heading", e.target.value)} placeholder="Book a Free Demo" />
              </div>
              <div className="space-y-2">
                <Label>Demo Form Subtext</Label>
                <Input value={cs.demo_subtext} onChange={(e) => updateCS("demo_subtext", e.target.value)} placeholder="Experience our teaching style" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Social Links */}
        <Card>
          <CardHeader><CardTitle className="text-base">Social Links</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {["linkedin", "twitter", "youtube", "instagram"].map((p) => (
                <div key={p} className="space-y-1">
                  <Label className="capitalize">{p}</Label>
                  <Input value={data.social_links[p] || ""} onChange={(e) => setData((prev) => ({ ...prev, social_links: { ...prev.social_links, [p]: e.target.value } }))} placeholder={`https://${p}.com/...`} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* SEO */}
        <Card>
          <CardHeader><CardTitle className="text-base">SEO Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Meta Title</Label>
              <Input value={data.meta_title} onChange={(e) => setData((p) => ({ ...p, meta_title: e.target.value }))} placeholder="Page title for search engines" maxLength={60} />
              <p className="text-xs text-muted-foreground">{data.meta_title.length}/60 characters</p>
            </div>
            <div className="space-y-2">
              <Label>Meta Description</Label>
              <Textarea value={data.meta_description} onChange={(e) => setData((p) => ({ ...p, meta_description: e.target.value }))} placeholder="Brief description for search results" rows={2} maxLength={160} />
              <p className="text-xs text-muted-foreground">{data.meta_description.length}/160 characters</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      {!isLocked && (
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          {data.slug && (
            <a href={`/coach-website/${data.slug}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline"><Eye className="h-4 w-4 mr-1" /> Preview</Button>
            </a>
          )}
          <Button variant="outline" onClick={saveDraft} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />} Save Draft
          </Button>
          {data.status !== "approved" && (
            <Button onClick={submitForApproval} disabled={saving || completionPercent() < 40}>
              <Send className="h-4 w-4 mr-1" /> Submit for Approval
            </Button>
          )}
        </div>
      )}

      <TemplateGallery
        open={templateGalleryOpen}
        onOpenChange={setTemplateGalleryOpen}
        onApply={applyTemplate}
        currentTemplateId={data.template_id}
      />
    </div>
  );
};

export default CoachWebsiteManager;
