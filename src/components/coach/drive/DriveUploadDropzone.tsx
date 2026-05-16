import { useState, useCallback } from "react";
import { Upload, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type UploadItem = { id: string; name: string; size: number; progress: number; status: "uploading" | "done" | "error"; error?: string };

export default function DriveUploadDropzone({
  category = "pdf",
  courseId,
  lessonId,
  onUploaded,
}: {
  category?: string;
  courseId?: string;
  lessonId?: string;
  onUploaded?: () => void;
}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const uploadOne = useCallback(async (file: File) => {
    const id = crypto.randomUUID();
    setItems((p) => [...p, { id, name: file.name, size: file.size, progress: 0, status: "uploading" }]);
    try {
      const { data: init, error } = await supabase.functions.invoke("drive-upload-init", {
        body: { name: file.name, mime_type: file.type || "application/octet-stream", size_bytes: file.size, category },
      });
      if (error || !init?.upload_url) throw new Error(error?.message || "Upload init failed");

      // Use XHR for progress, parse responseText for drive file metadata
      const driveFile = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", init.upload_url, true);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setItems((p) => p.map((it) => (it.id === id ? { ...it, progress: pct } : it)));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)); }
            catch { reject(new Error("Bad Drive response")); }
          } else reject(new Error(`Upload ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(file);
      });

      setItems((p) => p.map((it) => (it.id === id ? { ...it, progress: 100 } : it)));

      const { error: regErr } = await supabase.functions.invoke("drive-file-register", {
        body: { drive_file_id: driveFile.id, category, course_id: courseId, lesson_id: lessonId },
      });
      if (regErr) throw regErr;

      setItems((p) => p.map((it) => (it.id === id ? { ...it, status: "done" } : it)));
      toast.success(`Uploaded ${file.name}`);
      onUploaded?.();
    } catch (e: any) {
      setItems((p) => p.map((it) => (it.id === id ? { ...it, status: "error", error: String(e?.message ?? e) } : it)));
      toast.error(`Failed to upload ${file.name}: ${e?.message ?? e}`);
    }
  }, [category, courseId, lessonId, onUploaded]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(uploadOne);
  }, [uploadOne]);

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); handleFiles(e.dataTransfer.files); }}
        className={`relative rounded-2xl border-2 border-dashed p-10 text-center transition ${
          dragActive ? "border-primary bg-primary/5" : "border-border bg-card/40"
        }`}
      >
        <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-sm font-medium text-foreground">Drop files here or click to upload</p>
        <p className="text-xs text-muted-foreground">MP4, PDF, DOCX, PPT, XLS, ZIP, images, audio</p>
        <input
          type="file"
          multiple
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{it.name}</p>
                  <p className="text-xs text-muted-foreground">{(it.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                {it.status === "uploading" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                {it.status === "done" && <CheckCircle2 className="h-4 w-4 text-primary" />}
                {it.status === "error" && <AlertCircle className="h-4 w-4 text-destructive" />}
                <Button variant="ghost" size="icon" onClick={() => setItems((p) => p.filter((x) => x.id !== it.id))}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full transition-all ${it.status === "error" ? "bg-destructive" : "bg-primary"}`}
                  style={{ width: `${it.progress}%` }}
                />
              </div>
              {it.error && <p className="mt-1 text-xs text-destructive">{it.error}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
