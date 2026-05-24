import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, ClipboardList, ExternalLink, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props { courseId: string; }

const CoachAssignments = ({ courseId }: Props) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [subs, setSubs] = useState<Record<string, any[]>>({});
  const [editing, setEditing] = useState<any | null>(null);
  const [reviewing, setReviewing] = useState<any | null>(null);

  const load = async () => {
    const { data } = await supabase.from("assignments").select("*").eq("course_id", courseId).order("created_at");
    setItems(data || []);
    if (data?.length) {
      const { data: s } = await supabase.from("assignment_submissions").select("*").in("assignment_id", data.map((a) => a.id));
      const map: Record<string, any[]> = {};
      (s || []).forEach((x) => { (map[x.assignment_id] ||= []).push(x); });
      setSubs(map);
    }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [courseId]);

  const save = async (form: any) => {
    const payload = { ...form, course_id: courseId };
    delete payload.id;
    const { error } = editing?.id
      ? await supabase.from("assignments").update(payload).eq("id", editing.id)
      : await supabase.from("assignments").insert(payload);
    if (error) return toast({ title: error.message, variant: "destructive" });
    toast({ title: "Saved" });
    setEditing(null); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this assignment?")) return;
    await supabase.from("assignments").delete().eq("id", id);
    load();
  };

  const gradeSubmission = async (sub: any, score: number, feedback: string, status: string) => {
    const { error } = await supabase.from("assignment_submissions").update({
      score, feedback, status, graded_at: new Date().toISOString(),
    }).eq("id", sub.id);
    if (error) return toast({ title: error.message, variant: "destructive" });
    if (status === "approved") {
      await supabase.rpc("award_xp" as any, { _user_id: sub.user_id, _points: 50, _source: "assignment_approved", _source_id: sub.id, _course_id: courseId });
    }
    toast({ title: "Graded ✓" });
    load();
  };

  if (loading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" /> Assignments</h3>
        <Button size="sm" onClick={() => setEditing({ title: "", description: "", max_score: 100, due_days: 7, is_published: true })}>
          <Plus className="h-4 w-4 mr-1" /> New Assignment
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No assignments yet. Create your first to engage learners.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div key={a.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold flex items-center gap-2">{a.title}
                    {!a.is_published && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">Draft</span>}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Max {a.max_score} pts · Due {a.due_days || 0}d · {(subs[a.id] || []).length} submissions</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setReviewing(a)}>Review ({(subs[a.id] || []).length})</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(a)}><Edit className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing.id ? "Edit" : "New"} Assignment</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Title" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              <textarea placeholder="Description / Instructions" rows={4}
                value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                className="w-full rounded-lg border border-border bg-secondary/40 p-2 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground">Max score</label>
                  <Input type="number" value={editing.max_score} onChange={(e) => setEditing({ ...editing, max_score: +e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Due (days)</label>
                  <Input type="number" value={editing.due_days} onChange={(e) => setEditing({ ...editing, due_days: +e.target.value })} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!editing.is_published} onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })} />
                Published
              </label>
              <Button onClick={() => save(editing)} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {reviewing && (
        <Dialog open onOpenChange={(o) => !o && setReviewing(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Submissions: {reviewing.title}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              {(subs[reviewing.id] || []).length === 0 && <p className="text-sm text-muted-foreground">No submissions yet.</p>}
              {(subs[reviewing.id] || []).map((s) => (
                <SubmissionRow key={s.id} sub={s} maxScore={reviewing.max_score} onGrade={gradeSubmission} />
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

const SubmissionRow = ({ sub, maxScore, onGrade }: any) => {
  const [score, setScore] = useState(sub.score ?? "");
  const [feedback, setFeedback] = useState(sub.feedback ?? "");
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{new Date(sub.submitted_at).toLocaleString()}</span>
        <span className="capitalize rounded-full px-2 py-0.5 bg-secondary">{sub.status}</span>
      </div>
      {sub.submission_text && <p className="text-sm whitespace-pre-wrap">{sub.submission_text}</p>}
      {sub.submission_url && <a href={sub.submission_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><ExternalLink className="h-3 w-3" /> View submission</a>}
      <div className="grid grid-cols-2 gap-2">
        <Input type="number" placeholder={`Score / ${maxScore}`} value={score} onChange={(e) => setScore(e.target.value)} />
        <Input placeholder="Feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onGrade(sub, Number(score) || 0, feedback, "approved")}>
          <Star className="h-3 w-3 mr-1" /> Approve (+50 XP)
        </Button>
        <Button size="sm" variant="outline" onClick={() => onGrade(sub, Number(score) || 0, feedback, "reviewed")}>Reviewed</Button>
        <Button size="sm" variant="ghost" onClick={() => onGrade(sub, 0, feedback, "rejected")}>Reject</Button>
      </div>
    </div>
  );
};

export default CoachAssignments;
