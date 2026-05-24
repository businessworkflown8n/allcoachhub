import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Upload, Loader2, Link2 } from "lucide-react";
import { detectProvider, PROVIDER_LABELS } from "@/lib/lessonProviders";

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
  live_session_url?: string | null;
  live_session_starts_at?: string | null;
  sort_order?: number;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lesson: LessonRow | null;
  onSaved: () => void;
}

const TYPES = [
  { value: "link", label: "🔗 External Link (YouTube / Drive / Notion / PDF / …)" },
  { value: "video", label: "Video (Upload)" },
  { value: "video_url", label: "Video (YouTube / Vimeo URL)" },
  { value: "pdf", label: "PDF Document (Upload)" },
  { value: "text", label: "Text / Rich Content" },
  { value: "quiz", label: "Quiz" },
  { value: "assignment", label: "Assignment" },
  { value: "live", label: "Live Session" },
];

const LessonEditor = ({ open, onOpenChange, lesson, onSaved }: Props) => {
  const { user } = useAuth();
  const [form, setForm] = useState<LessonRow>(
    lesson || {
      module_id: "",
      title: "",
      content_type: "video",
      drip_days: 0,
      is_free_preview: false,
      is_published: true,
    }
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${form.module_id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("course-content").upload(path, file, { upsert: false });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("course-content").getPublicUrl(path);
    setForm((f) => ({ ...f, content_url: data.publicUrl }));
    toast({ title: "File uploaded" });
    setUploading(false);
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const isLink = form.content_type === "link";
    const detectedProvider = isLink && form.content_url ? detectProvider(form.content_url) : null;
    const payload: any = {
      module_id: form.module_id,
      title: form.title,
      content_type: form.content_type === "video_url" ? "video" : form.content_type,
      content_url: form.content_url || null,
      content_text: form.content_text || null,
      duration_minutes: form.duration_minutes || 0,
      drip_days: form.drip_days || 0,
      is_free_preview: !!form.is_free_preview,
      is_published: form.is_published !== false,
      live_session_url: form.live_session_url || null,
      live_session_starts_at: form.live_session_starts_at || null,
      provider: detectedProvider,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit Lesson" : "Add Lesson"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label>Lesson Type *</Label>
            <Select value={form.content_type} onValueChange={(v: any) => setForm({ ...form, content_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>


          {form.content_type === "link" && (
            <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <Label className="flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" /> External URL</Label>
              <Input
                value={form.content_url || ""}
                onChange={(e) => setForm({ ...form, content_url: e.target.value })}
                placeholder="Paste any YouTube, Vimeo, Loom, Google Drive, Notion, Canva, PDF, audio, or external URL"
              />
              {form.content_url && (
                <p className="text-xs text-muted-foreground">
                  Detected: <span className="font-medium text-foreground">{PROVIDER_LABELS[detectProvider(form.content_url)]}</span>
                  {" "}— learners will see an inline preview when supported, otherwise an open-link button.
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Supports: YouTube · Vimeo · Loom · Google Drive · Docs · Sheets · Slides · OneDrive · Dropbox · Notion · Canva · PDF · Audio · ZIP · any website.
              </p>
            </div>
          )}

          {form.content_type === "video" && (
            <div>
              <Label>Upload Video</Label>
              <div className="flex gap-2 items-center">
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Choose file
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                />
                {form.content_url && <span className="text-xs text-muted-foreground truncate max-w-xs">{form.content_url}</span>}
              </div>
            </div>
          )}

          {form.content_type === "video_url" && (
            <div>
              <Label>Video URL (YouTube / Vimeo)</Label>
              <Input value={form.content_url || ""} onChange={(e) => setForm({ ...form, content_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
            </div>
          )}

          {form.content_type === "pdf" && (
            <div>
              <Label>Upload PDF</Label>
              <div className="flex gap-2 items-center">
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Choose PDF
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                />
                {form.content_url && <a href={form.content_url} target="_blank" rel="noreferrer" className="text-xs text-primary truncate max-w-xs">View</a>}
              </div>
            </div>
          )}

          {form.content_type === "text" && (
            <div>
              <Label>Content (Markdown supported)</Label>
              <Textarea rows={8} value={form.content_text || ""} onChange={(e) => setForm({ ...form, content_text: e.target.value })} />
            </div>
          )}

          {form.content_type === "quiz" && (
            <div className="rounded-lg border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
              Save the lesson, then add quiz questions from the Quizzes section.
            </div>
          )}

          {form.content_type === "assignment" && (
            <div>
              <Label>Assignment Brief</Label>
              <Textarea rows={5} value={form.content_text || ""} onChange={(e) => setForm({ ...form, content_text: e.target.value })} placeholder="Describe what learners need to submit..." />
            </div>
          )}

          {form.content_type === "live" && (
            <>
              <div>
                <Label>Live Session URL (Zoom / Meet)</Label>
                <Input value={form.live_session_url || ""} onChange={(e) => setForm({ ...form, live_session_url: e.target.value })} placeholder="https://zoom.us/j/..." />
              </div>
              <div>
                <Label>Starts At</Label>
                <Input type="datetime-local" value={form.live_session_starts_at?.slice(0, 16) || ""} onChange={(e) => setForm({ ...form, live_session_starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Duration (minutes)</Label>
              <Input type="number" min={0} value={form.duration_minutes || 0} onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Drip Day (unlocks N days after enrollment)</Label>
              <Input type="number" min={0} value={form.drip_days || 0} onChange={(e) => setForm({ ...form, drip_days: parseInt(e.target.value) || 0 })} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Free Preview</p>
              <p className="text-xs text-muted-foreground">Available without enrollment</p>
            </div>
            <Switch checked={!!form.is_free_preview} onCheckedChange={(v) => setForm({ ...form, is_free_preview: v })} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Published</p>
              <p className="text-xs text-muted-foreground">Visible to enrolled learners</p>
            </div>
            <Switch checked={form.is_published !== false} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Save Lesson</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LessonEditor;
