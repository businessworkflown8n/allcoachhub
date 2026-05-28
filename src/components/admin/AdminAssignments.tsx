import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Trash2, Save, Eye } from "lucide-react";

interface Assignment {
  id: string; title: string; course_id: string; status: string;
  max_score: number; passing_marks: number | null;
  deadline_at: string | null; created_at: string;
}

const AdminAssignments = () => {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Record<string, string>>({});
  const [subs, setSubs] = useState<Record<string, any[]>>({});
  const [lbSettings, setLbSettings] = useState<Record<string, boolean>>({});
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: aRows } = await (supabase as any)
      .from("assignments").select("*").order("created_at", { ascending: false }).limit(200);
    setAssignments(aRows || []);
    const courseIds = Array.from(new Set((aRows || []).map((a: any) => a.course_id)));
    if (courseIds.length) {
      const { data: cs } = await supabase.from("courses").select("id, title").in("id", courseIds);
      const map: Record<string, string> = {};
      (cs || []).forEach((c: any) => { map[c.id] = c.title; });
      setCourses(map);
      const { data: ls } = await (supabase as any)
        .from("assignment_leaderboard_settings").select("course_id, is_enabled").in("course_id", courseIds);
      const lm: Record<string, boolean> = {};
      (ls || []).forEach((l: any) => { lm[l.course_id] = l.is_enabled; });
      setLbSettings(lm);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const loadSubs = async (assignmentId: string) => {
    const { data } = await supabase.from("assignment_submissions").select("*").eq("assignment_id", assignmentId).order("submitted_at", { ascending: false });
    setSubs((s) => ({ ...s, [assignmentId]: data || [] }));
  };

  const toggleLeaderboard = async (courseId: string) => {
    const cur = lbSettings[courseId] ?? true;
    const { error } = await (supabase as any)
      .from("assignment_leaderboard_settings")
      .upsert({ course_id: courseId, is_enabled: !cur, updated_at: new Date().toISOString() });
    if (error) return toast({ title: error.message, variant: "destructive" });
    setLbSettings((m) => ({ ...m, [courseId]: !cur }));
    toast({ title: !cur ? "Leaderboard enabled" : "Leaderboard disabled" });
  };

  const updateMark = async (subId: string, score: number) => {
    const { error } = await supabase.from("assignment_submissions").update({ score, graded_at: new Date().toISOString() }).eq("id", subId);
    if (error) return toast({ title: error.message, variant: "destructive" });
    toast({ title: "Marks updated" });
  };

  const deleteSubmission = async (subId: string, assignmentId: string) => {
    if (!confirm("Remove this submission?")) return;
    const { error } = await supabase.from("assignment_submissions").delete().eq("id", subId);
    if (error) return toast({ title: error.message, variant: "destructive" });
    loadSubs(assignmentId);
  };

  const exportCSV = (assignmentId: string) => {
    const rows = subs[assignmentId] || [];
    const a = assignments.find((x) => x.id === assignmentId);
    const header = ["learner_id", "status", "evaluation_status", "score", "max_score", "is_late", "submitted_at", "submission_url"];
    const csv = [header.join(",")].concat(rows.map((r) => [
      r.user_id, r.status, r.evaluation_status || "", r.score ?? "", a?.max_score ?? "", r.is_late ? "yes" : "no",
      r.submitted_at, (r.submission_url || "").replace(/,/g, ";"),
    ].join(","))).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `assignment-${assignmentId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">Assignments</h2>
        <p className="text-sm text-muted-foreground">Monitor all assignments, edit marks, manage leaderboard visibility and export reports.</p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground bg-secondary/40">
            <tr className="text-left">
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Course</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Marks</th>
              <th className="px-3 py-2">Deadline</th>
              <th className="px-3 py-2">Leaderboard</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => (
              <tr key={a.id} className="border-t border-border/40 align-top">
                <td className="px-3 py-2 font-medium">{a.title}</td>
                <td className="px-3 py-2 text-xs">{courses[a.course_id] || a.course_id.slice(0, 8)}</td>
                <td className="px-3 py-2 text-xs capitalize">{a.status}</td>
                <td className="px-3 py-2 text-xs">{a.max_score}{a.passing_marks ? ` / pass ${a.passing_marks}` : ""}</td>
                <td className="px-3 py-2 text-xs">{a.deadline_at ? new Date(a.deadline_at).toLocaleDateString() : "—"}</td>
                <td className="px-3 py-2 text-xs">
                  <Button size="sm" variant={lbSettings[a.course_id] === false ? "outline" : "default"} onClick={() => toggleLeaderboard(a.course_id)}>
                    {lbSettings[a.course_id] === false ? "Disabled" : "Enabled"}
                  </Button>
                </td>
                <td className="px-3 py-2 flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => { setOpenId(openId === a.id ? null : a.id); if (openId !== a.id) loadSubs(a.id); }}>
                    <Eye className="h-3 w-3 mr-1" /> Submissions
                  </Button>
                  <Button size="sm" variant="ghost" onClick={async () => { await loadSubs(a.id); setTimeout(() => exportCSV(a.id), 100); }}>
                    <Download className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
            {assignments.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No assignments found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {openId && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="font-semibold">Submissions</h3>
          {(subs[openId] || []).length === 0 && <p className="text-sm text-muted-foreground">No submissions.</p>}
          {(subs[openId] || []).map((s) => (
            <div key={s.id} className="rounded-lg border border-border/60 bg-secondary/30 p-3 grid md:grid-cols-5 gap-2 items-center text-xs">
              <span className="truncate">{s.user_id.slice(0, 8)}…</span>
              <span className="capitalize">{s.status}{s.is_late && <span className="ml-1 text-destructive">late</span>}</span>
              <Input type="number" defaultValue={s.score ?? ""} onBlur={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v) && v !== s.score) updateMark(s.id, v);
              }} className="h-8" />
              {s.submission_url ? <a className="text-primary truncate hover:underline" href={s.submission_url} target="_blank" rel="noreferrer">Open link</a> : <span>—</span>}
              <div className="flex gap-1 justify-end">
                <Button size="sm" variant="ghost" onClick={() => deleteSubmission(s.id, openId)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminAssignments;
