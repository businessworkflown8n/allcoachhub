import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen, Search, CheckCircle, XCircle, MessageSquare, Upload, ImageIcon, Eye, Trash2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { compressImage } from "@/lib/imageCompress";

const AdminCourses = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [changingId, setChangingId] = useState<string | null>(null);
  const [changeMessage, setChangeMessage] = useState("");
  const [thumbUploadId, setThumbUploadId] = useState<string | null>(null);
  const [thumbUploading, setThumbUploading] = useState(false);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const fetchAll = async () => {
    const [courseData, enrollData, profileData] = await Promise.all([
      supabase.from("courses").select("*").order("created_at", { ascending: false }),
      supabase.from("enrollments").select("course_id, id"),
      supabase.from("profiles").select("user_id, full_name"),
    ]);
    setCourses(courseData.data || []);
    setEnrollments(enrollData.data || []);
    setProfiles(profileData.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const getCoachName = (coachId: string) => profiles.find((p) => p.user_id === coachId)?.full_name || "—";
  const getEnrollmentCount = (courseId: string) => enrollments.filter((e) => e.course_id === courseId).length;

  const handleApprove = async (courseId: string) => {
    const { error } = await supabase.from("courses").update({ approval_status: "approved", is_published: true, rejection_reason: null }).eq("id", courseId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Course approved and published" });
    fetchAll();
  };

  const handleReject = async (courseId: string) => {
    if (!rejectReason.trim()) { toast({ title: "Please provide a reason", variant: "destructive" }); return; }
    const { error } = await supabase.from("courses").update({ approval_status: "rejected", is_published: false, rejection_reason: rejectReason }).eq("id", courseId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Course rejected" });
    setRejectingId(null);
    setRejectReason("");
    fetchAll();
  };

  const handleRequestChanges = async (courseId: string) => {
    if (!changeMessage.trim()) { toast({ title: "Please provide details", variant: "destructive" }); return; }
    const { error } = await supabase.from("courses").update({ approval_status: "changes_requested", is_published: false, rejection_reason: changeMessage }).eq("id", courseId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Changes requested" });
    setChangingId(null);
    setChangeMessage("");
    fetchAll();
  };

  const handleAdminThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !thumbUploadId) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      toast({ title: "Invalid file. Use an image under 5MB.", variant: "destructive" });
      return;
    }
    setThumbUploading(true);
    const course = courses.find(c => c.id === thumbUploadId);
    const ext = file.name.split(".").pop();
    const path = `course-thumbnails/${course?.coach_id || "admin"}/${thumbUploadId}.${ext}`;
    const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); setThumbUploading(false); return; }
    const { data: urlData } = supabase.storage.from("logos").getPublicUrl(path);
    await supabase.from("courses").update({ thumbnail_url: urlData.publicUrl, rejection_reason: null }).eq("id", thumbUploadId);
    toast({ title: "Thumbnail updated" });
    setThumbUploadId(null);
    setThumbUploading(false);
    if (thumbInputRef.current) thumbInputRef.current.value = "";
    fetchAll();
  };

  const filtered = courses.filter((c) => {
    const matchesSearch = !search || [c.title, c.category, getCoachName(c.coach_id)].some((v) => v?.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "all" || c.approval_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-400",
      approved: "bg-green-500/20 text-green-400",
      rejected: "bg-red-500/20 text-red-400",
      changes_requested: "bg-orange-500/20 text-orange-400",
    };
    return map[status] || "bg-muted text-muted-foreground";
  };

  if (loading) return <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mt-8" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-foreground">Course Management & Approvals</h2>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="changes_requested">Changes Requested</option>
          </select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search courses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary border-border w-56" />
          </div>
        </div>
      </div>

      {/* Pending count banner */}
      {courses.filter((c) => c.approval_status === "pending").length > 0 && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-yellow-400" />
          <span className="text-sm text-yellow-400 font-medium">
            {courses.filter((c) => c.approval_status === "pending").length} course(s) awaiting approval
          </span>
        </div>
      )}

      {/* Thumbnail requests banner */}
      {courses.filter((c) => c.rejection_reason?.startsWith("THUMBNAIL_REQUEST:")).length > 0 && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-blue-400" />
          <span className="text-sm text-blue-400 font-medium">
            {courses.filter((c) => c.rejection_reason?.startsWith("THUMBNAIL_REQUEST:")).length} thumbnail request(s) from coaches
          </span>
        </div>
      )}

      {/* Hidden file input for admin thumbnail upload */}
      <input ref={thumbInputRef} type="file" accept="image/*" onChange={handleAdminThumbUpload} className="hidden" />

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No courses found</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-auto">
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thumbnail</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Coach</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Price (USD)</TableHead>
                <TableHead>Enrollments</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {c.thumbnail_url ? (
                        <img src={c.thumbnail_url} alt="" className="h-10 w-16 rounded object-cover border border-border" />
                      ) : (
                        <div className="h-10 w-16 rounded border border-dashed border-border bg-secondary flex items-center justify-center">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <button
                        onClick={() => { setThumbUploadId(c.id); thumbInputRef.current?.click(); }}
                        title="Upload thumbnail"
                        className="rounded p-1 text-primary hover:bg-primary/10"
                        disabled={thumbUploading}
                      >
                        <Upload className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {c.rejection_reason?.startsWith("THUMBNAIL_REQUEST:") && (
                      <p className="text-[10px] text-blue-400 mt-1 max-w-[150px] truncate" title={c.rejection_reason.replace("THUMBNAIL_REQUEST: ", "")}>
                        📩 {c.rejection_reason.replace("THUMBNAIL_REQUEST: ", "")}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-foreground font-medium max-w-[200px] truncate">{c.title}</TableCell>
                  <TableCell className="text-muted-foreground">{getCoachName(c.coach_id)}</TableCell>
                  <TableCell className="text-muted-foreground">{c.category}</TableCell>
                  <TableCell className="text-muted-foreground">{c.level}</TableCell>
                  <TableCell className="text-foreground">${c.price_usd}</TableCell>
                  <TableCell className="text-foreground">{getEnrollmentCount(c.id)}</TableCell>
                  <TableCell>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(c.approval_status)}`}>
                      {c.approval_status === "changes_requested" ? "Changes Req." : c.approval_status}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {c.approval_status !== "approved" && (
                        <button onClick={() => handleApprove(c.id)} title="Approve" className="rounded p-1 text-green-400 hover:bg-green-500/10">
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      {c.approval_status !== "rejected" && (
                        <button onClick={() => { setRejectingId(c.id); setChangingId(null); }} title="Reject" className="rounded p-1 text-red-400 hover:bg-red-500/10">
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => { setChangingId(c.id); setRejectingId(null); }} title="Request Changes" className="rounded p-1 text-orange-400 hover:bg-orange-500/10">
                        <MessageSquare className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Reject dialog */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-lg font-bold text-foreground">Reject Course</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full rounded-lg border border-border bg-secondary p-3 text-sm text-foreground min-h-[100px]"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setRejectingId(null); setRejectReason(""); }} className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <button onClick={() => handleReject(rejectingId)} className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:brightness-110">Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Request changes dialog */}
      {changingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="text-lg font-bold text-foreground">Request Changes</h3>
            <textarea
              value={changeMessage}
              onChange={(e) => setChangeMessage(e.target.value)}
              placeholder="Describe the changes needed..."
              className="w-full rounded-lg border border-border bg-secondary p-3 text-sm text-foreground min-h-[100px]"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setChangingId(null); setChangeMessage(""); }} className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <button onClick={() => handleRequestChanges(changingId)} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110">Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCourses;
