import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Link2, ShieldAlert, Youtube, Video as VideoIcon, FileText, Globe, Presentation, AlertCircle } from "lucide-react";
import { detectProvider, PROVIDER_LABELS, buildEmbedUrl } from "@/lib/lessonProviders";
import {
  useCurriculumSettings,
  detectLinkType,
  validateLessonUrl,
  LINK_TYPE_LABELS,
  type CurriculumLinkType,
} from "@/hooks/useCurriculumSettings";

export type LessonRow = {
  id?: string;
  module_id: string;
  title: string;
  content_type: "video" | "video_url" | "pdf" | "text" | "quiz" | "assignment" | "live" | "link";
  content_url?: string | null;
  content_text?: string | null;
  duration_minutes?: number | null;
  drip_days?: number;
  is_free_preview?: boolean;
  is_published?: boolean;
  link_type?: CurriculumLinkType | null;
  open_in_new_tab?: boolean;
  preview_enabled?: boolean;
  sort_order?: number;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lesson: LessonRow | null;
  onSaved: () => void;
}

const TYPE_ICONS: Record<CurriculumLinkType, JSX.Element> = {
  youtube: <Youtube className="h-4 w-4 text-red-500" />,
  vimeo: <VideoIcon className="h-4 w-4 text-sky-400" />,
  google_drive: <FileText className="h-4 w-4 text-emerald-500" />,
  zoom: <VideoIcon className="h-4 w-4 text-blue-500" />,
  loom: <Presentation className="h-4 w-4 text-violet-400" />,
  website: <Globe className="h-4 w-4 text-muted-foreground" />,
  other: <Link2 className="h-4 w-4 text-muted-foreground" />,
};

const LessonEditor = ({ open, onOpenChange, lesson, onSaved }: Props) => {
  const { settings, loading: settingsLoading } = useCurriculumSettings();
  const [form, setForm] = useState<LessonRow>(
    lesson || {
      module_id: "",
      title: "",
      content_type: "link",
      drip_days: 0,
      is_free_preview: false,
      is_published: true,
      open_in_new_tab: false,
      preview_enabled: true,
    }
  );
  const [saving, setSaving] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Force link type for any new/legacy lesson — uploads are removed.
  useEffect(() => {
    if (form.content_type !== "link" && form.content_type !== "text" && form.content_type !== "quiz" && form.content_type !== "assignment") {
      setForm((f) => ({ ...f, content_type: "link" }));
    }
  }, [form.content_type]);

  // Auto-detect link type when URL changes
  useEffect(() => {
    if (form.content_type === "link" && form.content_url) {
      const detected = detectLinkType(form.content_url);
      if (form.link_type !== detected) setForm((f) => ({ ...f, link_type: detected }));
      setUrlError(validateLessonUrl(form.content_url, settings));
    } else {
      setUrlError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.content_url, settings]);

  const save = async () => {
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    if (form.content_type === "link") {
      const err = validateLessonUrl(form.content_url || "", settings);
      if (err) { toast({ title: err, variant: "destructive" }); return; }
    }
    setSaving(true);
    const detectedProvider = form.content_type === "link" && form.content_url ? detectProvider(form.content_url) : null;
    const payload: any = {
      module_id: form.module_id,
      title: form.title,
      content_type: form.content_type,
      content_url: form.content_url || null,
      content_text: form.content_text || null,
      duration_minutes: form.duration_minutes || 0,
      drip_days: form.drip_days || 0,
      is_free_preview: !!form.is_free_preview && settings.allow_preview,
      is_published: form.is_published !== false,
      provider: detectedProvider,
      link_type: form.content_type === "link" ? (form.link_type || detectLinkType(form.content_url || "")) : null,
      open_in_new_tab: !!form.open_in_new_tab && settings.allow_open_new_tab,
      preview_enabled: settings.allow_preview ? form.preview_enabled !== false : false,
    };
    const res = form.id
      ? await supabase.from("course_lessons").update(payload).eq("id", form.id)
      : await supabase.from("course_lessons").insert({ ...payload, sort_order: form.sort_order ?? 0 });
    setSaving(false);
    if (res.error) {
      toast({ title: "Save failed", description: res.error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Lesson saved" });
    onSaved();
    onOpenChange(false);
  };

  const embedUrl = form.content_type === "link" && form.content_url && !urlError ? buildEmbedUrl(form.content_url) : null;
  const detectedProvider = form.content_url ? detectProvider(form.content_url) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit Lesson" : "Add Lesson"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Lesson Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Introduction to Prompt Engineering" />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={form.content_text || ""}
              onChange={(e) => setForm({ ...form, content_text: e.target.value })}
              placeholder="Short description shown to learners…"
            />
          </div>

          <div>
            <Label>Lesson Type *</Label>
            <Select value={form.content_type} onValueChange={(v: any) => setForm({ ...form, content_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="link">🔗 External Link / Embed URL</SelectItem>
                <SelectItem value="quiz">📝 Quiz</SelectItem>
                <SelectItem value="assignment">📋 Assignment</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" /> File / video / PDF uploads are disabled by admin policy. Use external links only.
            </p>
          </div>

          {form.content_type === "link" && (
            <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" /> External URL *</Label>
                <Input
                  value={form.content_url || ""}
                  onChange={(e) => setForm({ ...form, content_url: e.target.value })}
                  placeholder="https://youtube.com/… · https://vimeo.com/… · https://drive.google.com/… · https://zoom.us/rec/…"
                />
                {urlError ? (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {urlError}
                  </p>
                ) : form.content_url ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    Detected:
                    <Badge variant="secondary" className="gap-1">
                      {TYPE_ICONS[form.link_type || detectLinkType(form.content_url)]}
                      {LINK_TYPE_LABELS[form.link_type || detectLinkType(form.content_url)]}
                    </Badge>
                    {detectedProvider && <span>· {PROVIDER_LABELS[detectedProvider]}</span>}
                  </div>
                ) : null}
              </div>

              <div>
                <Label>Link Type</Label>
                <Select
                  value={form.link_type || detectLinkType(form.content_url || "")}
                  onValueChange={(v: CurriculumLinkType) => setForm({ ...form, link_type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {settings.allowed_link_types.map((t) => (
                      <SelectItem key={t} value={t}>
                        <span className="inline-flex items-center gap-2">{TYPE_ICONS[t]} {LINK_TYPE_LABELS[t]}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {settings.allow_embed && embedUrl && (
                <div>
                  <Label className="text-xs text-muted-foreground">Preview</Label>
                  <div className="aspect-video w-full overflow-hidden rounded-md border border-border bg-black">
                    <iframe src={embedUrl} className="h-full w-full" allow="encrypted-media" />
                  </div>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground">
                Supports YouTube, Vimeo, Loom, Zoom recordings, Google Drive / Docs / Slides, Notion, Canva, public PDFs, audio &amp; any HTTPS URL.
              </p>
            </div>
          )}

          {form.content_type === "quiz" && (
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
              Save the lesson, then add quiz questions from the Quizzes tab.
            </div>
          )}

          {form.content_type === "assignment" && (
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
              Save the lesson, then configure brief &amp; submissions from the Assignments tab.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Duration (minutes)</Label>
              <Input type="number" min={0} value={form.duration_minutes || 0} onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Drip Day</Label>
              <Input type="number" min={0} value={form.drip_days || 0} onChange={(e) => setForm({ ...form, drip_days: parseInt(e.target.value) || 0 })} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Open in new tab</p>
                <p className="text-xs text-muted-foreground">Launch link in a separate tab</p>
              </div>
              <Switch
                disabled={!settings.allow_open_new_tab}
                checked={!!form.open_in_new_tab}
                onCheckedChange={(v) => setForm({ ...form, open_in_new_tab: v })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Enable Preview</p>
                <p className="text-xs text-muted-foreground">Show embedded player when supported</p>
              </div>
              <Switch
                disabled={!settings.allow_preview}
                checked={form.preview_enabled !== false}
                onCheckedChange={(v) => setForm({ ...form, preview_enabled: v })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Free Preview</p>
                <p className="text-xs text-muted-foreground">Available without enrollment</p>
              </div>
              <Switch
                disabled={!settings.allow_preview}
                checked={!!form.is_free_preview}
                onCheckedChange={(v) => setForm({ ...form, is_free_preview: v })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Published</p>
                <p className="text-xs text-muted-foreground">Visible to enrolled learners</p>
              </div>
              <Switch checked={form.is_published !== false} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || settingsLoading || !!urlError}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Save Lesson
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LessonEditor;
