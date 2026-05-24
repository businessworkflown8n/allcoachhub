import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { BookOpen, Clock, PlayCircle, Search, Award, TrendingUp, CheckCircle2, Loader2, User as UserIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import AssignedCoachesRail from "./lms/AssignedCoachesRail";
import GamificationCard from "./lms/GamificationCard";
import Leaderboard from "./lms/Leaderboard";

type Filter = "all" | "in_progress" | "completed" | "not_started" | "recent";

const LearnerCourses = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [certCount, setCertCount] = useState(0);
  const [moduleCounts, setModuleCounts] = useState<Record<string, { modules: number; lessons: number }>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: enrs }, { data: prof }, { count: cCount }] = await Promise.all([
        supabase.from("enrollments").select("*, courses(id, title, slug, category, duration_hours, thumbnail_url, coach_id)").eq("learner_id", user.id),
        supabase.from("profiles").select("full_name, avatar_url").eq("user_id", user.id).maybeSingle(),
        supabase.from("issued_certificates").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      const list = enrs || [];
      setEnrollments(list);
      setProfile(prof);
      setCertCount(cCount || 0);

      // Group coaches
      const coachIds = Array.from(new Set(list.map((e: any) => e.coach_id).filter(Boolean)));
      if (coachIds.length) {
        const { data: cps } = await supabase.from("profiles").select("user_id, full_name, avatar_url, bio, slug, email, whatsapp_number").in("user_id", coachIds);
        const counts: Record<string, number> = {};
        list.forEach((e: any) => { counts[e.coach_id] = (counts[e.coach_id] || 0) + 1; });
        setCoaches((cps || []).map((c: any) => ({
          ...c, course_count: counts[c.user_id] || 0, whatsapp: c.whatsapp_number,
        })));
      }

      // Module / lesson counts per course
      const courseIds = Array.from(new Set(list.map((e: any) => e.course_id)));
      if (courseIds.length) {
        const { data: mods } = await supabase.from("course_modules").select("id, course_id").in("course_id", courseIds).eq("is_published", true);
        const modIds = (mods || []).map((m: any) => m.id);
        const { data: lessons } = modIds.length
          ? await supabase.from("course_lessons").select("id, module_id").in("module_id", modIds).eq("is_published", true)
          : { data: [] };
        const map: Record<string, { modules: number; lessons: number }> = {};
        courseIds.forEach((cid) => { map[cid] = { modules: 0, lessons: 0 }; });
        (mods || []).forEach((m: any) => { map[m.course_id].modules += 1; });
        const modToCourse: Record<string, string> = {};
        (mods || []).forEach((m: any) => { modToCourse[m.id] = m.course_id; });
        (lessons || []).forEach((l: any) => {
          const cid = modToCourse[l.module_id];
          if (cid) map[cid].lessons += 1;
        });
        setModuleCounts(map);
      }

      setLoading(false);
    })();
  }, [user]);

  const stats = useMemo(() => {
    const total = enrollments.length;
    const completed = enrollments.filter((e) => Number(e.progress_percent) >= 100).length;
    const inProgress = enrollments.filter((e) => Number(e.progress_percent) > 0 && Number(e.progress_percent) < 100).length;
    const avg = total ? Math.round(enrollments.reduce((s, e) => s + Number(e.progress_percent || 0), 0) / total) : 0;
    return { total, completed, inProgress, avg };
  }, [enrollments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = enrollments;
    if (q) list = list.filter((e) => (e.courses?.title || "").toLowerCase().includes(q));
    if (filter === "completed") list = list.filter((e) => Number(e.progress_percent) >= 100);
    else if (filter === "in_progress") list = list.filter((e) => Number(e.progress_percent) > 0 && Number(e.progress_percent) < 100);
    else if (filter === "not_started") list = list.filter((e) => Number(e.progress_percent) === 0);
    else if (filter === "recent") list = [...list].sort((a, b) => new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime());
    return list;
  }, [enrollments, search, filter]);

  if (loading) {
    return <div className="space-y-6">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-40 w-full" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-56 w-full" />)}</div>
    </div>;
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <header className="rounded-2xl border border-border/60 bg-gradient-to-br from-card to-secondary/20 p-6">
        <div className="flex items-center gap-4">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover border border-border" />
          ) : (
            <div className="h-14 w-14 rounded-full bg-primary/15 grid place-items-center text-primary"><UserIcon className="h-6 w-6" /></div>
          )}
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Welcome back</p>
            <h1 className="text-2xl font-bold text-foreground">{profile?.full_name || "Learner"} 👋</h1>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat icon={<BookOpen className="h-4 w-4" />} label="Total Courses" value={stats.total} />
          <Stat icon={<Loader2 className="h-4 w-4" />} label="In Progress" value={stats.inProgress} />
          <Stat icon={<CheckCircle2 className="h-4 w-4" />} label="Completed" value={stats.completed} />
          <Stat icon={<Award className="h-4 w-4" />} label="Certificates" value={certCount} />
        </div>
        {stats.total > 0 && (
          <div className="mt-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Overall completion</span>
              <span className="font-semibold text-primary">{stats.avg}%</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${stats.avg}%` }} />
            </div>
          </div>
        )}
      </header>

      {/* COACHES */}
      <AssignedCoachesRail coaches={coaches} />

      {/* CONTINUE LEARNING */}
      {(() => {
        const continueList = [...enrollments]
          .filter((e) => Number(e.progress_percent) > 0 && Number(e.progress_percent) < 100)
          .sort((a, b) => new Date(b.last_accessed_at || b.enrolled_at).getTime() - new Date(a.last_accessed_at || a.enrolled_at).getTime())
          .slice(0, 3);
        if (!continueList.length) return null;
        return (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-foreground flex items-center gap-2">
                <PlayCircle className="h-4 w-4 text-primary" /> Continue Learning
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {continueList.map((e) => {
                const c = e.courses || {};
                const pct = Number(e.progress_percent || 0);
                return (
                  <Link key={e.id} to={`/learn/${e.course_id}`}
                    className="group flex gap-3 rounded-xl border border-border/60 bg-gradient-to-br from-card to-primary/5 p-3 hover:border-primary/40 transition">
                    <div className="w-20 h-20 shrink-0 rounded-lg bg-secondary overflow-hidden">
                      {c.thumbnail_url ? (
                        <img src={c.thumbnail_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                      ) : <div className="w-full h-full grid place-items-center text-muted-foreground"><BookOpen className="h-6 w-6" /></div>}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-primary font-semibold">Resume</p>
                        <h3 className="text-xs font-bold text-foreground line-clamp-2 group-hover:text-primary transition">{c.title}</h3>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-muted-foreground">{pct}% done</span>
                        </div>
                        <div className="h-1 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })()}

      {/* SEARCH + FILTERS */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your courses..."
            className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {([
            ["all", "All"], ["in_progress", "In Progress"], ["completed", "Completed"],
            ["not_started", "Not Started"], ["recent", "Recently Added"],
          ] as [Filter, string][]).map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition ${filter === k ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* COURSES GRID */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border bg-card">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">{enrollments.length ? "No matching courses" : "No courses assigned yet"}</h3>
          <p className="text-sm text-muted-foreground mt-1">{enrollments.length ? "Try a different filter" : "Browse the catalog to enroll"}</p>
          {!enrollments.length && (
            <Link to="/" className="mt-4 inline-block rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110">Browse Courses</Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => {
            const c = e.courses || {};
            const pct = Number(e.progress_percent || 0);
            const counts = moduleCounts[e.course_id] || { modules: 0, lessons: 0 };
            const cta = pct >= 100 ? "Review" : pct > 0 ? "Continue" : "Start";
            return (
              <div key={e.id} className="rounded-2xl border border-border/60 bg-card overflow-hidden flex flex-col group hover:border-primary/40 transition">
                <div className="aspect-video bg-secondary relative overflow-hidden">
                  {c.thumbnail_url ? (
                    <img src={c.thumbnail_url} alt={c.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-muted-foreground"><BookOpen className="h-10 w-10" /></div>
                  )}
                  {pct >= 100 && (
                    <span className="absolute top-2 right-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">COMPLETED</span>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col gap-3">
                  <div className="space-y-1">
                    {c.category && <span className="text-[10px] uppercase tracking-wide text-primary font-semibold">{c.category}</span>}
                    <h3 className="text-sm font-bold text-foreground line-clamp-2">{c.title}</h3>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {counts.modules} mod · {counts.lessons} les</span>
                    {c.duration_hours ? <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {Number(c.duration_hours)}h</span> : null}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="text-foreground font-medium">{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <Link to={`/learn/${e.course_id}`}
                    className="mt-auto inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:brightness-110">
                    <PlayCircle className="h-3.5 w-3.5" /> {cta} Learning
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Stat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <div className="rounded-xl border border-border/40 bg-background/40 p-3">
    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">{icon}{label}</div>
    <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
  </div>
);

export default LearnerCourses;
