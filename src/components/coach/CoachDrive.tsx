import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDriveConnection } from "@/hooks/useDriveConnection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { HardDrive, RefreshCw, Unplug, FolderOpen, Sparkles, Trash2, Eye, Share2, Loader2, Cloud, AlertCircle } from "lucide-react";
import DriveUploadDropzone from "./drive/DriveUploadDropzone";
import { toast } from "sonner";

type DriveFile = {
  id: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  category: string;
  visibility: string;
  web_view_link: string | null;
  thumbnail_link: string | null;
  drive_file_id: string;
  ai_tags: string[] | null;
  ai_summary: string | null;
  uploaded_at: string;
};

const CATEGORIES = [
  { key: "course", label: "Courses" },
  { key: "recording", label: "Live Class Recordings" },
  { key: "pdf", label: "PDFs & Resources" },
  { key: "assignment", label: "Assignments" },
  { key: "student_upload", label: "Student Uploads" },
  { key: "archived", label: "Archived Content" },
];

function formatBytes(n: number | null) {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  return `${(n / Math.pow(1024, i)).toFixed(1)} ${u[i]}`;
}

export default function CoachDrive() {
  const { user } = useAuth();
  const { connection, loading, connect, disconnect, refreshStats } = useDriveConnection();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [activeCategory, setActiveCategory] = useState("pdf");
  const [connecting, setConnecting] = useState(false);
  const [aiProcessingId, setAiProcessingId] = useState<string | null>(null);

  const loadFiles = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("drive_files" as any)
      .select("*")
      .eq("coach_id", user.id)
      .order("uploaded_at", { ascending: false })
      .limit(200);
    setFiles((data as any) ?? []);
  };

  useEffect(() => { loadFiles(); }, [user, connection?.status]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await connect();
      await loadFiles();
      toast.success("Google Drive connected");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to connect");
    } finally { setConnecting(false); }
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Google Drive? Your files in Drive will not be deleted.")) return;
    await disconnect();
    toast.success("Disconnected");
  };

  const handleDelete = async (f: DriveFile) => {
    if (!confirm(`Delete "${f.name}"? This removes it from Google Drive permanently.`)) return;
    const { error } = await supabase.functions.invoke("drive-file-delete", { body: { file_id: f.id } });
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    loadFiles();
  };

  const handleShare = async (f: DriveFile, vis: string) => {
    const { error } = await supabase.functions.invoke("drive-share-toggle", { body: { file_id: f.id, visibility: vis } });
    if (error) return toast.error(error.message);
    toast.success(`Visibility: ${vis}`);
    loadFiles();
  };

  const handleAI = async (f: DriveFile) => {
    setAiProcessingId(f.id);
    const { error } = await supabase.functions.invoke("drive-ai-process", { body: { file_id: f.id } });
    setAiProcessingId(null);
    if (error) return toast.error(error.message);
    toast.success("AI summary ready");
    loadFiles();
  };

  if (loading) return <div className="flex h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  // Not connected
  if (!connection || connection.status === "revoked") {
    return (
      <div className="space-y-6">
        <Header />
        <Card className="border-border bg-card/60 p-10 text-center backdrop-blur">
          <Cloud className="mx-auto h-12 w-12 text-primary" />
          <h3 className="mt-4 text-xl font-semibold text-foreground">Connect your Google Drive</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Upload course videos, PDFs, recordings, and resources directly to your own Google Drive.
            Files stream to learners without using server storage.
          </p>
          <Button onClick={handleConnect} disabled={connecting} className="mt-6">
            {connecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Connect Google Drive
          </Button>
        </Card>
      </div>
    );
  }

  const expired = connection.status === "expired";
  const used = connection.quota_used ?? 0;
  const total = connection.quota_total ?? 0;
  const pct = total ? Math.min(100, (used / total) * 100) : 0;
  const categoryFiles = files.filter((f) => f.category === activeCategory);

  return (
    <div className="space-y-6">
      <Header />

      {expired && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="flex-1">Your Drive token expired. Reconnect to continue uploading.</span>
          <Button size="sm" variant="outline" onClick={handleConnect}>Reconnect</Button>
        </div>
      )}

      {/* Status + storage cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border bg-gradient-to-br from-primary/10 to-card p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/20 p-2"><HardDrive className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="text-sm font-semibold text-foreground capitalize">{connection.status}</p>
            </div>
          </div>
          <p className="mt-3 truncate text-xs text-muted-foreground">{connection.google_account_email}</p>
          <div className="mt-4 flex gap-2">
            <Button size="sm" variant="outline" onClick={refreshStats}><RefreshCw className="mr-1 h-3 w-3" /> Sync</Button>
            <Button size="sm" variant="ghost" onClick={handleDisconnect}><Unplug className="mr-1 h-3 w-3" /> Disconnect</Button>
          </div>
        </Card>

        <Card className="border-border bg-card p-5 md:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Storage</p>
            <p className="text-xs text-muted-foreground">Last sync: {connection.last_sync_at ? new Date(connection.last_sync_at).toLocaleString() : "—"}</p>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">{formatBytes(used)}</span>
            <span className="text-sm text-muted-foreground">of {formatBytes(total)} used</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <Stat label="Files" value={files.length} />
            <Stat label="Used" value={`${pct.toFixed(1)}%`} />
            <Stat label="Free" value={formatBytes(Math.max(0, total - used))} />
          </div>
        </Card>
      </div>

      {/* Upload */}
      <Card className="border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Upload to {CATEGORIES.find(c => c.key === activeCategory)?.label}</h3>
        <DriveUploadDropzone category={activeCategory} onUploaded={loadFiles} />
      </Card>

      {/* Folder tabs + files */}
      <Card className="border-border bg-card p-5">
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="flex w-full flex-wrap gap-1 bg-transparent">
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c.key} value={c.key} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <FolderOpen className="mr-1 h-3 w-3" /> {c.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {CATEGORIES.map((c) => (
            <TabsContent key={c.key} value={c.key} className="mt-4">
              {categoryFiles.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No files in this folder yet.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryFiles.map((f) => (
                    <Card key={f.id} className="group border-border bg-background p-4 transition hover:border-primary/40">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground" title={f.name}>{f.name}</p>
                          <p className="text-xs text-muted-foreground">{formatBytes(f.size_bytes)} · {f.mime_type?.split("/")[1]}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{f.visibility}</Badge>
                      </div>
                      {f.ai_tags && f.ai_tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {f.ai_tags.slice(0, 4).map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                        </div>
                      )}
                      {f.ai_summary && (
                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{f.ai_summary}</p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-1">
                        <Button size="sm" variant="ghost" onClick={() => window.open(f.web_view_link!, "_blank")}>
                          <Eye className="mr-1 h-3 w-3" /> View
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleAI(f)} disabled={aiProcessingId === f.id}>
                          {aiProcessingId === f.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Sparkles className="mr-1 h-3 w-3" />}
                          AI
                        </Button>
                        <select
                          className="rounded border border-border bg-background px-1 text-xs text-foreground"
                          value={f.visibility}
                          onChange={(e) => handleShare(f, e.target.value)}
                        >
                          <option value="private">Private</option>
                          <option value="students">Students</option>
                          <option value="stream_only">Stream only</option>
                          <option value="public">Public link</option>
                        </select>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(f)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </Card>
    </div>
  );
}

function Header() {
  return (
    <div>
      <h2 className="text-xl font-bold text-foreground">Google Drive Storage</h2>
      <p className="text-sm text-muted-foreground">Upload course materials, recordings, and resources directly to your Google Drive.</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card/60 p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
