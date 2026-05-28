import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Users, Award, TrendingUp, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CourseRow {
  id: string;
  title: string;
  category: string | null;
  coach_id: string;
  coach_name?: string;
  enrolled: number;
  completed: number;
  avg_progress: number;
  certificates: number;
}

const AdminLMSOverview = () => {
  const [rows, setRows] = useState<CourseRow[]>([]);
  const [stats, setStats] = useState({ courses: 0, learners: 0, completions: 0, certificates: 0, avgProgress: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: courses }, { data: enrollments }, { data: certs }] = await Promise.all([
        supabase.from("courses").select("id, title, category, coach_id").eq("is_published", true),
        supabase.from("enrollments").select("course_id, learner_id, progress_percent, completed_at"),
        supabase.from("issued_certificates").select("course_id"),
      ]);

      const certByCourse = new Map<string, number>();
      (certs || []).forEach((c: any) => certByCourse.set(c.course_id, (certByCourse.get(c.course_id) || 0) + 1));

      const enrByCourse = new Map<string, any[]>();
      (enrollments || []).forEach((e: any) => {
        const arr = enrByCourse.get(e.course_id) || [];
        arr.push(e);
        enrByCourse.set(e.course_id, arr);
      });

      const coachIds = Array.from(new Set((courses || []).map((c: any) => c.coach_id)));
      const { data: profs } = coachIds.length
        ? await supabase.from("profiles").select("user_id, full_name").in("user_id", coachIds)
        : { data: [] };
      const coachMap = new Map((profs || []).map((p: any) => [p.user_id, p.full_name]));

      const built: CourseRow[] = (courses || []).map((c: any) => {
        const es = enrByCourse.get(c.id) || [];
        const completed = es.filter((e) => Number(e.progress_percent) >= 100).length;
        const avg = es.length
          ? Math.round(es.reduce((s, e) => s + Number(e.progress_percent || 0), 0) / es.length)
          : 0;
        return {
          id: c.id, title: c.title, category: c.category, coach_id: c.coach_id,
          coach_name: coachMap.get(c.coach_id) || "—",
          enrolled: es.length, completed, avg_progress: avg,
          certificates: certByCourse.get(c.id) || 0,
        };
      });

      built.sort((a, b) => b.enrolled - a.enrolled);

      const totalEnr = (enrollments || []).length;
      const totalComp = (enrollments || []).filter((e: any) => Number(e.progress_percent) >= 100).length;
      const uniqueLearners = new Set((enrollments || []).map((e: any) => e.learner_id)).size;
      const totalAvg = totalEnr
        ? Math.round((enrollments || []).reduce((s, e: any) => s + Number(e.progress_percent || 0), 0) / totalEnr)
        : 0;

      setRows(built);
      setStats({
        courses: built.length,
        learners: uniqueLearners,
        completions: totalComp,
        certificates: (certs || []).length,
        avgProgress: totalAvg,
      });
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return r.title.toLowerCase().includes(q) || (r.coach_name || "").toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">LMS Oversight</h1>
        <p className="text-sm text-muted-foreground">Cross-course view of learner progress, completions, and certificates.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={<BookOpen className="h-4 w-4" />} label="Published Courses" value={stats.courses} />
        <StatCard icon={<Users className="h-4 w-4" />} label="Unique Learners" value={stats.learners} />
        <StatCard icon={<Loader2 className="h-4 w-4" />} label="Avg Progress" value={`${stats.avgProgress}%`} />
        <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Completions" value={stats.completions} />
        <StatCard icon={<Award className="h-4 w-4" />} label="Certificates" value={stats.certificates} />
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by course or coach..."
        className="w-full max-w-md rounded-lg border border-border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
      />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-muted-foreground text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-4 py-3">Course</th>
                <th className="text-left px-4 py-3">Coach</th>
                <th className="text-right px-4 py-3">Enrolled</th>
                <th className="text-right px-4 py-3">Completed</th>
                <th className="text-left px-4 py-3 w-48">Avg Progress</th>
                <th className="text-right px-4 py-3">Certificates</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No courses match.</td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-secondary/20">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground line-clamp-1">{r.title}</div>
                    {r.category && <div className="text-[11px] text-muted-foreground">{r.category}</div>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.coach_name}</td>
                  <td className="px-4 py-3 text-right font-medium">{r.enrolled}</td>
                  <td className="px-4 py-3 text-right text-primary font-semibold">{r.completed}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${r.avg_progress}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right">{r.avg_progress}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">{r.certificates}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) => (
  <div className="rounded-xl border border-border bg-card p-3">
    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">{icon}{label}</div>
    <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
  </div>
);

export default AdminLMSOverview;
