import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, FileVideo, FileImage, FileText, Search } from "lucide-react";

type DriveFile = {
  id: string;
  drive_file_id: string;
  name: string;
  mime_type: string;
  size_bytes: number | null;
  thumbnail_url: string | null;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accept?: "video" | "image" | "any";
  onSelect: (file: DriveFile) => void;
}

const DrivePicker = ({ open, onOpenChange, accept = "any", onSelect }: Props) => {
  const { user } = useAuth();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      setLoading(true);
      let query = supabase
        .from("drive_files" as any)
        .select("id, drive_file_id, name, mime_type, size_bytes, thumbnail_url")
        .eq("coach_id", user.id)
        .order("uploaded_at", { ascending: false })
        .limit(200);
      if (accept === "video") query = query.like("mime_type", "video/%");
      else if (accept === "image") query = query.like("mime_type", "image/%");
      const { data } = await query;
      setFiles(((data as any) || []) as DriveFile[]);
      setLoading(false);
    })();
  }, [open, user, accept]);

  const filtered = q
    ? files.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()))
    : files;

  const iconFor = (mime: string) => {
    if (mime.startsWith("video/")) return <FileVideo className="h-5 w-5 text-primary" />;
    if (mime.startsWith("image/")) return <FileImage className="h-5 w-5 text-primary" />;
    return <FileText className="h-5 w-5 text-primary" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select from Google Drive</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your Drive files..." />
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 mt-2">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No files found. Upload files from the Drive Storage page first.
            </p>
          ) : (
            filtered.map((f) => (
              <button
                key={f.id}
                onClick={() => { onSelect(f); onOpenChange(false); }}
                className="w-full flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:bg-accent text-left transition-colors"
              >
                {f.thumbnail_url ? (
                  <img src={f.thumbnail_url} alt="" className="h-10 w-10 rounded object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded bg-secondary flex items-center justify-center">{iconFor(f.mime_type)}</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.mime_type}{f.size_bytes ? ` · ${(f.size_bytes / (1024 * 1024)).toFixed(1)} MB` : ""}</p>
                </div>
              </button>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DrivePicker;
