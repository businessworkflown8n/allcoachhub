import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { ImageIcon, CheckCircle, XCircle, Clock, Upload, Trash2, RotateCw, Search } from "lucide-react";

interface Row {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  coach_profile_image_url: string | null;
  profile_image_status: string;
  profile_image_uploaded_at: string | null;
  profile_image_approved_at: string | null;
  profile_image_approved_by: string | null;
  profile_image_reject_reason: string | null;
  approver_name?: string | null;
}

const FILTERS = ["pending", "approved", "rejected", "all"] as const;
type Filter = typeof FILTERS[number];

const AdminCoachProfilePictures = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("pending");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);

  const fetchRows = async () => {
    setLoading(true);
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "coach");
    const ids = (roles || []).map((r) => r.user_id);
    if (ids.length === 0) { setRows([]); setLoading(false); return; }
    const { data } = await supabase
      .from("profiles")
      .select("user_id, full_name, email, avatar_url, coach_profile_image_url, profile_image_status, profile_image_uploaded_at, profile_image_approved_at, profile_image_approved_by, profile_image_reject_reason" as any)
      .in("user_id", ids);

    const approverIds = Array.from(new Set(((data as any[]) || []).map((r) => r.profile_image_approved_by).filter(Boolean)));
    let approverMap = new Map<string, string>();
    if (approverIds.length) {
      const { data: ap } = await supabase.from("profiles").select("user_id, full_name").in("user_id", approverIds);
      approverMap = new Map((ap || []).map((p: any) => [p.user_id, p.full_name || ""]));
    }
    setRows(((data as any[]) || []).map((r) => ({ ...r, approver_name: r.profile_image_approved_by ? approverMap.get(r.profile_image_approved_by) || "Admin" : null })));
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, []);

  const callReview = async (coachId: string, action: "approve" | "reject" | "request_reupload" | "delete", reason?: string) => {
    setBusy(coachId + action);
    const { error } = await supabase.rpc("review_coach_profile_image" as any, { _coach_id: coachId, _action: action, _reason: reason ?? null });
    setBusy(null);
    if (error) { toast({ title: "Action failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Profile picture ${action.replace("_", " ")}d` });
    fetchRows();
  };

  const adminUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget || !user) return;
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) { toast({ title: "Invalid format", variant: "destructive" }); return; }
    if (file.size > 5 * 1024 * 1024) { toast({ title: "Too large (max 5MB)", variant: "destructive" }); return; }
    setBusy(uploadTarget + "upload");
    const ext = file.name.split(".").pop();
    const path = `${uploadTarget}/profile-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("coach-profile-images").upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
    if (upErr) { setBusy(null); toast({ title: "Upload failed", description: upErr.message, variant: "destructive" }); return; }
    const { data: pub } = supabase.storage.from("coach-profile-images").getPublicUrl(path);
    const url = pub.publicUrl;
    const { error: dbErr } = await supabase.from("profiles").update({
      coach_profile_image_url: url,
      avatar_url: url,
      profile_image_status: "approved",
      profile_image_uploaded_at: new Date().toISOString(),
      profile_image_approved_at: new Date().toISOString(),
      profile_image_approved_by: user.id,
      profile_image_reject_reason: null,
    } as any).eq("user_id", uploadTarget);
    setBusy(null);
    setUploadTarget(null);
    if (uploadRef.current) uploadRef.current.value = "";
    if (dbErr) { toast({ title: "Save failed", description: dbErr.message, variant: "destructive" }); return; }
    toast({ title: "Profile picture uploaded & approved" });
    fetchRows();
  };

  const filtered = rows.filter((r) => {
    if (filter !== "all" && r.profile_image_status !== filter) return false;
    if (filter === "pending" && !r.coach_profile_image_url) return false;
    const q = search.toLowerCase();
    if (q && !((r.full_name || "").toLowerCase().includes(q) || (r.email || "").toLowerCase().includes(q))) return false;
    return true;
  });

  const counts = {
    pending: rows.filter((r) => r.profile_image_status === "pending" && r.coach_profile_image_url).length,
    approved: rows.filter((r) => r.profile_image_status === "approved").length,
    rejected: rows.filter((r) => r.profile_image_status === "rejected").length,
  };

  const statusBadge = (s: string) => {
    if (s === "approved") return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
    if (s === "rejected") return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
    return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <ImageIcon className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-foreground">Coach Profile Picture Approvals</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Review, approve, replace or remove coach profile photos.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search coach..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-7 h-8 w-44" />
            </div>
            {FILTERS.map((f) => (
              <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">
                {f}{f === "pending" ? ` (${counts.pending})` : f === "approved" ? ` (${counts.approved})` : f === "rejected" ? ` (${counts.rejected})` : ""}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-center py-8">Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Preview</TableHead>
                  <TableHead>Coach</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approved By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const previewUrl = r.profile_image_status === "pending" ? r.coach_profile_image_url : r.avatar_url;
                  return (
                    <TableRow key={r.user_id}>
                      <TableCell>
                        {previewUrl ? (
                          <img src={previewUrl} alt={r.full_name || ""} className="h-14 w-14 rounded-full object-cover border border-border" />
                        ) : (
                          <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center text-xs text-muted-foreground border border-border">N/A</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{r.full_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{r.email}</p>
                          {r.profile_image_reject_reason && (
                            <p className="text-xs text-destructive mt-0.5">{r.profile_image_reject_reason}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.profile_image_uploaded_at ? new Date(r.profile_image_uploaded_at).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>{statusBadge(r.profile_image_status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.approver_name || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1 flex-wrap">
                          {r.coach_profile_image_url && r.profile_image_status !== "approved" && (
                            <Button size="sm" variant="default" disabled={!!busy} onClick={() => callReview(r.user_id, "approve")}>
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />Approve
                            </Button>
                          )}
                          {r.coach_profile_image_url && r.profile_image_status === "pending" && (
                            <Button size="sm" variant="destructive" disabled={!!busy} onClick={() => {
                              const reason = window.prompt("Reason for rejection?", "Image quality is too low");
                              if (reason !== null) callReview(r.user_id, "reject", reason);
                            }}>
                              <XCircle className="h-3.5 w-3.5 mr-1" />Reject
                            </Button>
                          )}
                          {r.coach_profile_image_url && (
                            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => {
                              const reason = window.prompt("Message to coach?", "Please re-upload with a higher quality square image");
                              if (reason !== null) callReview(r.user_id, "request_reupload", reason);
                            }}>
                              <RotateCw className="h-3.5 w-3.5 mr-1" />Re-upload
                            </Button>
                          )}
                          <Button size="sm" variant="outline" disabled={!!busy} onClick={() => { setUploadTarget(r.user_id); uploadRef.current?.click(); }}>
                            <Upload className="h-3.5 w-3.5 mr-1" />Replace
                          </Button>
                          {(r.avatar_url || r.coach_profile_image_url) && (
                            <Button size="sm" variant="outline" className="text-destructive" disabled={!!busy} onClick={() => {
                              if (window.confirm("Delete this coach's profile picture?")) callReview(r.user_id, "delete");
                            }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No coaches in this view.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
        <input ref={uploadRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={adminUpload} className="hidden" />
      </CardContent>
    </Card>
  );
};

export default AdminCoachProfilePictures;
