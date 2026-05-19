import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import {
  BookOpen, Plus, Edit, Trash2, Eye, EyeOff, Users, Clock, CheckCircle,
  AlertTriangle, ListTree, Search, LayoutGrid, List as ListIcon, Sparkles,
  TrendingUp, FileText,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

type FilterKey = "all" | "published" | "draft" | "pending";

const CoachCourses = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollCounts, setEnrollCounts] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [view, setView] = useState<"grid" | "list">("grid");

  const fetchCourses = async () => {
    if (!user) return;
    const { data } = await supabase.from("courses").select("*").eq("coach_id", user.id).order("created_at", { ascending: false });
    setCourses(data || []);

    if (data && data.length > 0) {
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("course_id")
        .in("course_id", data.map((c: any) => c.id));
      const counts: Record<string, number> = {};
      (enrollments || []).forEach((e: any) => {
        counts[e.course_id] = (counts[e.course_id] || 0) + 1;
      });
      setEnrollCounts(counts);
    }
    setLoading(false);
  };

  useEffect(() => { fetchCourses(); }, [user]);

  const deleteCourse = async (id: string) => {
    if (!confirm("Are you sure you want to delete this course?")) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Course deleted" });
      setCourses(courses.filter((c) => c.id !== id));
    }
  };

  const togglePublish = async (id: string, current: boolean) => {
    const course = courses.find((c) => c.id === id);
    if (!current && course?.requires_category_approval) {
      toast({
        title: "Cannot publish yet",
        description: "This course is pending category approval. You can publish it once the category is approved.",
        variant: "destructive",
      });
      return;
    }
    await supabase.from("courses").update({ is_published: !current }).eq("id", id);
    setCourses(courses.map((c) => c.id === id ? { ...c, is_published: !current } : c));
    toast({ title: current ? "Course unpublished" : "Course published" });
  };

  const getStatusBadge = (course: any) => {
    if (course.requires_category_approval) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-yellow-500/15 text-yellow-300 ring-1 ring-yellow-500/30">
          <Clock className="h-3 w-3" /> Pending Approval
        </span>
      );
    }
    if (course.approval_status === "approved" && !course.is_published) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
          <CheckCircle className="h-3 w-3" /> Ready to Publish
        </span>
      );
    }
    if (course.is_published) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-primary/15 text-primary ring-1 ring-primary/30">
          <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(72_100%_50%)] animate-pulse" />
          Published
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-secondary text-muted-foreground ring-1 ring-border">
        <FileText className="h-3 w-3" /> Draft
      </span>
    );
  };

  const stats = useMemo(() => {
    const total = courses.length;
    const published = courses.filter((c) => c.is_published).length;
    const drafts = courses.filter((c) => !c.is_published && !c.requires_category_approval).length;
    const pending = courses.filter((c) => c.requires_category_approval).length;
    const totalStudents = Object.values(enrollCounts).reduce((a, b) => a + b, 0);
    return { total, published, drafts, pending, totalStudents };
  }, [courses, enrollCounts]);

  const filtered = useMemo(() => {
    let list = courses;
    if (filter === "published") list = list.filter((c) => c.is_published);
    else if (filter === "draft") list = list.filter((c) => !c.is_published && !c.requires_category_approval);
    else if (filter === "pending") list = list.filter((c) => c.requires_category_approval);
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((c) => (c.title || "").toLowerCase().includes(q) || (c.category || "").toLowerCase().includes(q));
    return list;
  }, [courses, filter, query]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-card/50 animate-pulse" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-card/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Total Courses", value: stats.total, icon: BookOpen, accent: "text-primary" },
    { label: "Published", value: stats.published, icon: CheckCircle, accent: "text-emerald-400" },
    { label: "Drafts", value: stats.drafts, icon: FileText, accent: "text-muted-foreground" },
    { label: "Students", value: stats.totalStudents, icon: Users, accent: "text-primary" },
  ];

  const filters: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "All", count: stats.total },
    { key: "published", label: "Published", count: stats.published },
    { key: "draft", label: "Drafts", count: stats.drafts },
    { key: "pending", label: "Pending", count: stats.pending },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">My Courses</h2>
          <p className="text-sm text-muted-foreground mt-1">Build, publish, and manage your premium learning experiences.</p>
        </div>
        <Link
          to="/coach/courses/new"
          className="cta-3d primary sm self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" /> Create Course
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="card-premium p-4 hover-lift">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
                <p className="mt-1.5 text-2xl font-bold text-foreground tabular-nums">{s.value}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/60 ${s.accent}`}>
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      {courses.length > 0 && (
        <div className="card-premium p-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search courses by title or category..."
              className="w-full rounded-xl border border-border/40 bg-secondary/50 py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 focus:bg-secondary/80 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
            />
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-secondary/40 p-1 border border-border/40 overflow-x-auto">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                  filter === f.key
                    ? "bg-primary/15 text-primary nav-active-glow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
                <span className={`tabular-nums rounded-md px-1.5 py-0.5 text-[10px] ${filter === f.key ? "bg-primary/20" : "bg-background/60"}`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-secondary/40 p-1 border border-border/40">
            <button
              onClick={() => setView("grid")}
              className={`p-1.5 rounded-lg transition-all ${view === "grid" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`p-1.5 rounded-lg transition-all ${view === "list" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              aria-label="List view"
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {courses.length === 0 ? (
        <div className="card-premium relative overflow-hidden text-center py-20 px-6">
          <div className="absolute inset-0 opacity-50" style={{ background: "radial-gradient(circle at 50% 30%, hsl(72 100% 50% / 0.08), transparent 60%)" }} />
          <div className="relative">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <Sparkles className="h-8 w-8 text-primary icon-glow" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Launch your first course</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
              Design your curriculum, add videos and lessons, and start earning. Our AI assistant can help you outline a course in minutes.
            </p>
            <Link to="/coach/courses/new" className="cta-3d primary sm inline-flex mt-6">
              <Plus className="h-4 w-4" /> Create Your First Course
            </Link>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card-premium py-16 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 text-sm text-muted-foreground">No courses match your filters.</p>
        </div>
      ) : view === "grid" ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <CourseCard
              key={c.id}
              c={c}
              enrolled={enrollCounts[c.id] || 0}
              badge={getStatusBadge(c)}
              onToggle={() => togglePublish(c.id, c.is_published)}
              onDelete={() => deleteCourse(c.id)}
            />
          ))}
        </div>
      ) : (
        <div className="card-premium overflow-hidden">
          <div className="divide-y divide-border/40">
            {filtered.map((c) => (
              <CourseRow
                key={c.id}
                c={c}
                enrolled={enrollCounts[c.id] || 0}
                badge={getStatusBadge(c)}
                onToggle={() => togglePublish(c.id, c.is_published)}
                onDelete={() => deleteCourse(c.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------- Card view ---------- */
const CourseCard = ({ c, enrolled, badge, onToggle, onDelete }: any) => {
  const thumbApproved = c.thumbnail_url && c.thumbnail_status === "approved";
  const thumbPending = c.thumbnail_url && !thumbApproved;

  return (
    <div className="card-premium group overflow-hidden flex flex-col">
      {/* Thumbnail */}
      <div className="relative h-36 overflow-hidden">
        {thumbApproved ? (
          <img src={c.thumbnail_url} alt={c.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : thumbPending ? (
          <>
            <img src={c.thumbnail_url} alt={c.title} className="h-full w-full object-cover opacity-40" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium backdrop-blur-md ${
                c.thumbnail_status === "rejected"
                  ? "bg-destructive/80 text-destructive-foreground"
                  : "bg-yellow-500/80 text-primary-foreground"
              }`}>
                {c.thumbnail_status === "rejected" ? "Rejected" : "Under Review"}
              </span>
            </div>
          </>
        ) : (
          <div className="h-full w-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(220 18% 16%), hsl(220 22% 10%))" }}>
            <BookOpen className="h-10 w-10 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card via-card/60 to-transparent pointer-events-none" />
        <div className="absolute top-3 left-3">{badge}</div>
        {c.category && (
          <div className="absolute top-3 right-3">
            <span className="rounded-full bg-background/70 backdrop-blur-md px-2 py-0.5 text-[10px] font-medium text-foreground/80 ring-1 ring-white/10">
              {c.category}
            </span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <h3 className="text-sm font-bold text-foreground line-clamp-2 leading-snug min-h-[2.5rem]">{c.title}</h3>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-md bg-secondary/60 px-1.5 py-0.5 capitalize">{c.level}</span>
          <span className="text-foreground/80 font-semibold">${Number(c.price_usd)}</span>
          <span className="text-muted-foreground/60">·</span>
          <span className="text-foreground/80 font-semibold">₹{Number(c.price_inr)}</span>
        </div>

        {c.requires_category_approval && (
          <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-2">
            <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-yellow-300/90 leading-relaxed">
              Awaiting category approval. You'll be notified once approved.
            </p>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mt-auto">
          <Users className="h-3.5 w-3.5 text-primary/70" />
          <span className="tabular-nums text-foreground/90 font-semibold">{enrolled}</span>
          <span>Students Enrolled</span>
        </div>

        <div className="flex items-center gap-1 pt-3 border-t border-border/40">
          <Link
            to={`/coach/courses/${c.id}/edit`}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
          >
            <Edit className="h-3 w-3" /> Edit
          </Link>
          <Link
            to={`/coach/courses/${c.id}/curriculum`}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <ListTree className="h-3 w-3" /> Curriculum
          </Link>
          <button
            onClick={onToggle}
            disabled={c.requires_category_approval && !c.is_published}
            className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors ${
              c.requires_category_approval && !c.is_published
                ? "opacity-40 cursor-not-allowed text-muted-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            }`}
          >
            {c.is_published ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {c.is_published ? "Unpublish" : "Publish"}
          </button>
          <button
            onClick={onDelete}
            className="ml-auto flex items-center gap-1 rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            aria-label="Delete course"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------- List view ---------- */
const CourseRow = ({ c, enrolled, badge, onToggle, onDelete }: any) => {
  const thumbApproved = c.thumbnail_url && c.thumbnail_status === "approved";
  return (
    <div className="flex items-center gap-4 p-4 hover:bg-secondary/30 transition-colors">
      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg ring-1 ring-border/40">
        {thumbApproved ? (
          <img src={c.thumbnail_url} alt={c.title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-secondary/60">
            <BookOpen className="h-5 w-5 text-muted-foreground/40" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-foreground truncate">{c.title}</h3>
          {badge}
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          {c.category && <span className="text-primary/80">{c.category}</span>}
          <span>·</span>
          <span className="capitalize">{c.level}</span>
          <span>·</span>
          <span>${Number(c.price_usd)} / ₹{Number(c.price_inr)}</span>
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Users className="h-3.5 w-3.5 text-primary/70" />
        <span className="tabular-nums text-foreground/90 font-semibold">{enrolled}</span>
      </div>
      <div className="flex items-center gap-1">
        <Link
          to={`/coach/courses/${c.id}/edit`}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary/60 hover:text-foreground transition-colors"
          aria-label="Edit"
        >
          <Edit className="h-4 w-4" />
        </Link>
        <Link
          to={`/coach/courses/${c.id}/curriculum`}
          className="rounded-lg p-1.5 text-primary hover:bg-primary/10 transition-colors"
          aria-label="Curriculum"
        >
          <ListTree className="h-4 w-4" />
        </Link>
        <button
          onClick={onToggle}
          disabled={c.requires_category_approval && !c.is_published}
          className={`rounded-lg p-1.5 transition-colors ${
            c.requires_category_approval && !c.is_published
              ? "opacity-40 cursor-not-allowed text-muted-foreground"
              : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
          }`}
          aria-label={c.is_published ? "Unpublish" : "Publish"}
        >
          {c.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default CoachCourses;
