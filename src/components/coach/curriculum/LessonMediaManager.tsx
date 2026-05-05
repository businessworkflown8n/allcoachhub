import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureControl } from "@/hooks/useFeatureControl";
import { useCoachPlan } from "@/hooks/useCoachPlan";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Upload, Loader2, Trash2, Video, Youtube, Image as ImageIcon, Mic, Lock, Play, Square } from "lucide-react";

type Media = {
  id: string;
  lesson_id: string;
  media_type: "video_upload" | "youtube" | "recording" | "image";
  title: string | null;
  caption: string | null;
  video_url: string | null;
  youtube_url: string | null;
  youtube_mode: "embed" | "redirect" | null;
  image_url: string | null;
  thumbnail_url: string | null;
  sort_order: number;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lessonId: string;
  lessonTitle: string;
}

const LessonMediaManager = ({ open, onOpenChange, lessonId, lessonTitle }: Props) => {
  const { user } = useAuth();
  const plan = useCoachPlan();
  const fUpload = useFeatureControl("course_video_upload", plan);
  const fYoutube = useFeatureControl("course_youtube_link", plan);
  const fRecord = useFeatureControl("course_video_recording", plan);
  const fImage = useFeatureControl("course_image_upload", plan);

  const [items, setItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [ytUrl, setYtUrl] = useState("");
  const [ytTitle, setYtTitle] = useState("");
  const [ytMode, setYtMode] = useState<"embed" | "redirect">("embed");

  // recorder state
  const [recording, setRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("lecture_media").select("*").eq("lesson_id", lessonId).order("sort_order");
    setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open, lessonId]);

  const insert = async (row: Partial<Media>) => {
    const { error } = await supabase.from("lecture_media").insert({
      lesson_id: lessonId,
      sort_order: items.length,
      created_by: user?.id,
      ...row,
    } as any);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Media added" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this media?")) return;
    await supabase.from("lecture_media").delete().eq("id", id);
    load();
  };

  const uploadFile = async (file: File, kind: "video_upload" | "image" | "recording") => {
    if (!user) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || (kind === "image" ? "png" : "webm");
    const path = `${user.id}/${lessonId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("course-content").upload(path, file, { upsert: false });
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("course-content").getPublicUrl(path);
    await insert({
      media_type: kind,
      title: file.name,
      [kind === "image" ? "image_url" : "video_url"]: data.publicUrl,
    } as any);
    setUploading(false);
  };

  const startRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream, { mimeType: "video/webm" });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: "video/webm" });
        stream.getTracks().forEach((t) => t.stop());
        await uploadFile(file, "recording");
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
    } catch (e: any) {
      toast({ title: "Recording failed", description: e.message, variant: "destructive" });
    }
  };
  const stopRecord = () => { recRef.current?.stop(); setRecording(false); };

  const renderLocked = (name: string, reason?: string) => (
    <div className="rounded-lg border border-dashed border-border bg-secondary/30 p-6 text-center">
      <Lock className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
      <p className="text-sm font-medium text-foreground">{name} is locked</p>
      <p className="text-xs text-muted-foreground mt-1">{reason === "global_off" ? "Disabled platform-wide by admin." : "Not available on your current plan or admin approval is pending."}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lecture Media · {lessonTitle}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="video" className="mt-2">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="video"><Video className="h-4 w-4 mr-1" /> Video</TabsTrigger>
            <TabsTrigger value="youtube"><Youtube className="h-4 w-4 mr-1" /> YouTube</TabsTrigger>
            <TabsTrigger value="record"><Mic className="h-4 w-4 mr-1" /> Record</TabsTrigger>
            <TabsTrigger value="image"><ImageIcon className="h-4 w-4 mr-1" /> Images</TabsTrigger>
          </TabsList>

          <TabsContent value="video" className="space-y-3 pt-4">
            {fUpload.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : !fUpload.data?.enabled ? renderLocked("Video Upload", fUpload.data?.reason) : (
              <div>
                <Label>Upload video file</Label>
                <Input type="file" accept="video/*" disabled={uploading} onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "video_upload")} />
                {uploading && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Uploading...</p>}
              </div>
            )}
          </TabsContent>

          <TabsContent value="youtube" className="space-y-3 pt-4">
            {fYoutube.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : !fYoutube.data?.enabled ? renderLocked("YouTube Link", fYoutube.data?.reason) : (
              <div className="space-y-3">
                <div>
                  <Label>Title</Label>
                  <Input value={ytTitle} onChange={(e) => setYtTitle(e.target.value)} placeholder="Lesson video title" />
                </div>
                <div>
                  <Label>YouTube URL</Label>
                  <Input value={ytUrl} onChange={(e) => setYtUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">Mode</p>
                    <p className="text-xs text-muted-foreground">{ytMode === "embed" ? "Play inside the platform" : "Open YouTube in a new tab"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs">Embed</span>
                    <Switch checked={ytMode === "redirect"} onCheckedChange={(v) => setYtMode(v ? "redirect" : "embed")} />
                    <span className="text-xs">Redirect</span>
                  </div>
                </div>
                <Button onClick={async () => {
                  if (!ytUrl.trim()) return toast({ title: "URL required", variant: "destructive" });
                  await insert({ media_type: "youtube", title: ytTitle || "YouTube Video", youtube_url: ytUrl, youtube_mode: ytMode });
                  setYtUrl(""); setYtTitle("");
                }}>Add YouTube Link</Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="record" className="space-y-3 pt-4">
            {fRecord.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : !fRecord.data?.enabled ? renderLocked("Video Recording", fRecord.data?.reason) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Record directly from your webcam. The recording uploads automatically when you stop.</p>
                {!recording ? (
                  <Button onClick={startRecord} className="gap-2"><Play className="h-4 w-4" /> Start Recording</Button>
                ) : (
                  <Button onClick={stopRecord} variant="destructive" className="gap-2"><Square className="h-4 w-4" /> Stop & Save</Button>
                )}
                {uploading && <p className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Uploading recording...</p>}
              </div>
            )}
          </TabsContent>

          <TabsContent value="image" className="space-y-3 pt-4">
            {fImage.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : !fImage.data?.enabled ? renderLocked("Image Upload", fImage.data?.reason) : (
              <div>
                <Label>Upload images (you can add multiple, one at a time)</Label>
                <Input type="file" accept="image/*" disabled={uploading} onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  for (const f of files) await uploadFile(f, "image");
                }} multiple />
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-6">
          <p className="text-sm font-semibold mb-2">Attached media ({items.length})</p>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : items.length === 0 ? (
            <p className="text-xs text-muted-foreground">No media attached yet.</p>
          ) : (
            <div className="space-y-2">
              {items.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  {m.media_type === "youtube" && <Youtube className="h-4 w-4 text-red-500" />}
                  {m.media_type === "image" && <ImageIcon className="h-4 w-4 text-primary" />}
                  {m.media_type === "video_upload" && <Video className="h-4 w-4 text-primary" />}
                  {m.media_type === "recording" && <Mic className="h-4 w-4 text-primary" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.title || m.media_type}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.youtube_url || m.video_url || m.image_url}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => remove(m.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LessonMediaManager;
