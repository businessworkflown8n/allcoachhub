import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ClipboardList, Upload, ExternalLink, CheckCircle2, Clock, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  courseId: string;
  moduleId?: string;
  hideIfEmpty?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  submitted: "bg-yellow-500/15 text-yellow-400",
  reviewed: "bg-blue-500/15 text-blue-400",
  approved: "bg-green-500/15 text-green-400",
  rejected: "bg-destructive/15 text-destructive",
};

const AssignmentPanel = ({ courseId, moduleId, hideIfEmpty }: Props) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [subs, setSubs] = useState<Record<string, any>>({});
  const [drafts, setDrafts] = useState<Record<string, { text: string; link: string; file: File | null }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    let q = supabase.from("assignments").select("*").eq("course_id", courseId).eq("is_published", true);
    if (moduleId) q = q.eq("module_id", moduleId);
    const { data: aRows } = await q.order("created_at");
    setAssignments(aRows || []);
    if (aRows && aRows.length) {
      const { data: sRows } = await supabase.from("assignment_submissions").select("*")
        .eq("user_id", user.id).in("assignment_id", aRows.map((a) => a.id));
      const map: Record<string, any> = {};
      (sRows || []).forEach((s) => { map[s.assignment_id] = s; });
      setSubs(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user, courseId, moduleId]);

  const submit = async (a: any) => {
    if (!user) return;
    const draft = drafts[a.id] || { text: "", link: "", file: null };
    if (!draft.text && !draft.link && !draft.file) {
      toast({ title: "Add text, link, or file", variant: "destructive" }); return;
    }
    setBusy(a.id);
    let url: string | null = draft.link || null;
    if (draft.file) {
      const path = `assignments/${user.id}/${a.id}/${Date.now()}-${draft.file.name}`;
      const { error: upErr } = await supabase.storage.from("course-content").upload(path, draft.file, { upsert: true });
      if (upErr) { toast({ title: "Upload failed", description: upErr.message, variant: "destructive" }); setBusy(null); return; }
      const { data: pub } = supabase.storage.from("course-content").getPublicUrl(path);
      url = pub.publicUrl;
    }
    const payload = {
      assignment_id: a.id, user_id: user.id,
      submission_url: url, submission_text: draft.text || null,
      status: "submitted", submitted_at: new Date().toISOString(),
    };
    const existing = subs[a.id];
    const { error } = existing
      ? await supabase.from("assignment_submissions").update(payload).eq("id", existing.id)
      : await supabase.from("assignment_submissions").insert(payload);
    setBusy(null);
    if (error) { toast({ title: "Submission failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: existing ? "Submission updated" : "Submitted ✓" });
    setDrafts((d) => ({ ...d, [a.id]: { text: "", link: "", file: null } }));
    load();
  };

  if (loading) return <Skeleton className="h-40 w-full" />;
  if (!assignments.length) return (
    <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground flex items-center gap-2">
      <ClipboardList className="h-4 w-4" /> No assignments {moduleId ? "for this module" : "in this course"}.
    </div>
  );

  return (
    <div className="space-y-4">
      {assignments.map((a) => {
        const s = subs[a.id];
        const draft = drafts[a.id] || { text: "", link: "", file: null };
        const isLocked = s?.status === "approved";
        return (
          <div key={a.id} className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-semibold flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" /> {a.title}</h4>
                {a.description && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.description}</p>}
                <p className="text-xs text-muted-foreground mt-2">Max score: {a.max_score}{a.due_days ? ` · Due in ${a.due_days} days` : ""}</p>
              </div>
              {s && <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_COLORS[s.status] || "bg-secondary"}`}>{s.status}</span>}
            </div>

            {s && (
              <div className="rounded-lg bg-secondary/40 p-3 text-xs space-y-1">
                <p className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Submitted {new Date(s.submitted_at).toLocaleString()}</p>
                {s.submission_url && <a href={s.submission_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><ExternalLink className="h-3 w-3" /> View submission</a>}
                {s.submission_text && <p className="text-foreground whitespace-pre-wrap">{s.submission_text}</p>}
                {s.score !== null && s.score !== undefined && <p className="text-foreground font-semibold">Score: {s.score}/{a.max_score}</p>}
                {s.feedback && <p className="text-muted-foreground"><strong>Feedback:</strong> {s.feedback}</p>}
              </div>
            )}

            {!isLocked && (
              <div className="space-y-2 border-t border-border/50 pt-3">
                <textarea
                  rows={3}
                  placeholder="Your answer / notes (optional)"
                  value={draft.text}
                  onChange={(e) => setDrafts((d) => ({ ...d, [a.id]: { ...draft, text: e.target.value } }))}
                  className="w-full rounded-lg border border-border bg-secondary/40 p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
                <input
                  type="url"
                  placeholder="Link (Google Drive, Notion, GitHub, etc.)"
                  value={draft.link}
                  onChange={(e) => setDrafts((d) => ({ ...d, [a.id]: { ...draft, link: e.target.value } }))}
                  className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 cursor-pointer rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs hover:bg-secondary">
                    <Upload className="h-3.5 w-3.5" />
                    {draft.file ? draft.file.name : "Attach PDF / DOC / Image"}
                    <input type="file" accept=".pdf,.doc,.docx,image/*" className="hidden"
                      onChange={(e) => setDrafts((d) => ({ ...d, [a.id]: { ...draft, file: e.target.files?.[0] || null } }))} />
                  </label>
                  <Button size="sm" onClick={() => submit(a)} disabled={busy === a.id}>
                    {busy === a.id ? "Submitting..." : s ? "Update Submission" : "Submit"}
                  </Button>
                </div>
              </div>
            )}
            {isLocked && <p className="text-xs text-primary flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Approved — locked from edits</p>}
          </div>
        );
      })}
    </div>
  );
};

export default AssignmentPanel;
