import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { ClipboardList, ExternalLink, CheckCircle2, Clock, CalendarClock, Trophy, Link as LinkIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import CourseLeaderboard from "./CourseLeaderboard";

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
  late: "bg-orange-500/15 text-orange-400",
};

const EVAL_COLORS: Record<string, string> = {
  pass: "bg-green-500/15 text-green-400",
  fail: "bg-destructive/15 text-destructive",
  needs_improvement: "bg-yellow-500/15 text-yellow-400",
};

const ALLOWED_LINK_HOSTS = [
  "drive.google.com", "docs.google.com",
  "onedrive.live.com", "1drv.ms", "sharepoint.com",
  "dropbox.com",
  "github.com", "gist.github.com",
];

function validateLink(url: string): { ok: boolean; reason?: string } {
  if (!url) return { ok: true };
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return { ok: false, reason: "Use http(s) URLs only" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "Invalid URL" };
  }
}

const Countdown = ({ deadline }: { deadline: string }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const diff = new Date(deadline).getTime() - now;
  if (diff <= 0) return <span className="text-destructive">Closed</span>;
  const days = Math.floor(diff / 86_400_000);
  const hrs = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  return <span>{days > 0 ? `${days}d ` : ""}{hrs}h {mins}m left</span>;
};

const AssignmentPanel = ({ courseId, moduleId, hideIfEmpty }: Props) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [subs, setSubs] = useState<Record<string, any>>({});
  const [drafts, setDrafts] = useState<Record<string, { text: string; link: string }>>({});
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

  // Realtime updates for submissions on this user
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`asub-${user.id}-${courseId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "assignment_submissions", filter: `user_id=eq.${user.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "assignments", filter: `course_id=eq.${courseId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [user, courseId]);

  const submit = async (a: any) => {
    if (!user) return;
    if (a.status === "closed") { toast({ title: "Assignment is closed", variant: "destructive" }); return; }
    if (a.deadline_at && new Date(a.deadline_at).getTime() < Date.now() && !subs[a.id]) {
      // Allowed but flagged late by trigger
    }
    const draft = drafts[a.id] || { text: "", link: "" };
    if (!draft.text && !draft.link) {
      toast({ title: "Add a link or text response", variant: "destructive" }); return;
    }
    const lv = validateLink(draft.link);
    if (!lv.ok) { toast({ title: lv.reason!, variant: "destructive" }); return; }

    setBusy(a.id);
    const payload = {
      assignment_id: a.id, user_id: user.id,
      submission_url: draft.link || null,
      submission_text: draft.text || null,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    };
    const existing = subs[a.id];
    const { error } = existing
      ? await supabase.from("assignment_submissions").update(payload).eq("id", existing.id)
      : await supabase.from("assignment_submissions").insert(payload);
    setBusy(null);
    if (error) { toast({ title: "Submission failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: existing ? "Submission updated" : "Submitted ✓" });
    setDrafts((d) => ({ ...d, [a.id]: { text: "", link: "" } }));
    load();
  };

  const hasAny = assignments.length > 0;

  if (loading) return <Skeleton className="h-40 w-full" />;
  if (!hasAny) {
    if (hideIfEmpty) return null;
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground flex items-center gap-2">
        <ClipboardList className="h-4 w-4" /> No assignments {moduleId ? "for this module" : "in this course"}.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {assignments.map((a) => {
          const s = subs[a.id];
          const draft = drafts[a.id] || { text: "", link: "" };
          const isApproved = s?.status === "approved";
          const isClosed = a.status === "closed";
          const pastDeadline = a.deadline_at && new Date(a.deadline_at).getTime() < Date.now();
          const lockEdit = isApproved || isClosed;
          return (
            <div key={a.id} className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="font-semibold flex items-center gap-2 flex-wrap">
                    <ClipboardList className="h-4 w-4 text-primary" /> {a.title}
                    {isClosed && <span className="rounded-full bg-destructive/15 text-destructive px-2 py-0.5 text-[10px]">Closed</span>}
                  </h4>
                  {a.description && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.description}</p>}
                  {a.instructions && (
                    <div className="mt-2 rounded-lg bg-secondary/40 p-3 text-xs text-foreground whitespace-pre-wrap">
                      <strong className="text-muted-foreground">Instructions:</strong> {a.instructions}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-3">
                    <span>Max {a.max_score}{a.passing_marks ? ` · Pass ${a.passing_marks}` : ""}</span>
                    {a.deadline_at && (
                      <span className="flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        {new Date(a.deadline_at).toLocaleString()} ·{" "}
                        <Countdown deadline={a.deadline_at} />
                      </span>
                    )}
                  </div>
                  {a.attachment_url && (
                    <a href={a.attachment_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                      <ExternalLink className="h-3 w-3" /> Attached resource
                    </a>
                  )}
                  {Array.isArray(a.reference_links) && a.reference_links.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {a.reference_links.map((r: string, i: number) => (
                        <a key={i} href={r} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs rounded-full bg-secondary px-2 py-1 hover:bg-secondary/70">
                          <LinkIcon className="h-3 w-3" /> Reference {i + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {s && <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_COLORS[s.status] || "bg-secondary"}`}>{s.status}</span>}
                  {s?.evaluation_status && <span className={`rounded-full px-2 py-0.5 text-[10px] capitalize ${EVAL_COLORS[s.evaluation_status] || "bg-secondary"}`}>{s.evaluation_status.replace("_", " ")}</span>}
                </div>
              </div>

              {s && (
                <div className="rounded-lg bg-secondary/40 p-3 text-xs space-y-1">
                  <p className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Submitted {new Date(s.submitted_at).toLocaleString()}{s.is_late && <span className="ml-1 text-destructive">(Late)</span>}</p>
                  {s.submission_url && <a href={s.submission_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><ExternalLink className="h-3 w-3" /> View submission</a>}
                  {s.submission_text && <p className="text-foreground whitespace-pre-wrap">{s.submission_text}</p>}
                  {s.score !== null && s.score !== undefined && <p className="text-foreground font-semibold">Score: {s.score}/{a.max_score}</p>}
                  {s.feedback && <p className="text-muted-foreground"><strong>Feedback:</strong> {s.feedback}</p>}
                </div>
              )}

              {!lockEdit && (
                <div className="space-y-2 border-t border-border/50 pt-3">
                  <p className="text-[11px] text-muted-foreground">
                    Submit via Google Drive, OneDrive, Dropbox, GitHub or any public link.
                  </p>
                  <input
                    type="url"
                    placeholder="Paste submission link (Drive / OneDrive / Dropbox / GitHub / URL)"
                    value={draft.link}
                    onChange={(e) => setDrafts((d) => ({ ...d, [a.id]: { ...draft, link: e.target.value } }))}
                    className="w-full rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                  <textarea
                    rows={3}
                    placeholder="Optional text response / notes"
                    value={draft.text}
                    onChange={(e) => setDrafts((d) => ({ ...d, [a.id]: { ...draft, text: e.target.value } }))}
                    className="w-full rounded-lg border border-border bg-secondary/40 p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                  <div className="flex items-center justify-between gap-2">
                    {pastDeadline && <span className="text-[11px] text-destructive">Deadline passed — submission will be marked late.</span>}
                    <Button size="sm" onClick={() => submit(a)} disabled={busy === a.id} className="ml-auto">
                      {busy === a.id ? "Submitting..." : s ? "Update Submission" : "Submit"}
                    </Button>
                  </div>
                </div>
              )}
              {isApproved && <p className="text-xs text-primary flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Approved — locked from edits</p>}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h4 className="font-semibold flex items-center gap-2 mb-3"><Trophy className="h-4 w-4 text-primary" /> Course Leaderboard</h4>
        <CourseLeaderboard courseId={courseId} />
      </div>
    </div>
  );
};

export default AssignmentPanel;
