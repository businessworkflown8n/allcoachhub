import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import {
  BookOpen, Plus, Edit, Trash2, Eye, EyeOff, Users,
  Clock, CheckCircle, AlertTriangle, ListTree, Search, LayoutGrid, List, Sparkles, Lock,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

type FilterKey = "all" | "published" | "drafts" | "pending";
type ViewMode = "grid" | "list";

const CoachCourses = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollCounts, setEnrollCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [view, setView] = useState<ViewMode>("grid");

  const fetchCourses = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("courses")
      .select("*")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false });
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

  const viewStudents = async (courseId: string, courseTitle: string) => {
    setStudentsCourseTitle(courseTitle);
    setShowStudents(courseId);
    const { data } = await supabase
      .from("enrollments")
      .select("id, full_name, email, contact_number, enrolled_at")
      .eq("course_id", courseId)
      .order("enrolled_at", { ascending: false });
    setStudents(data || []);
  };

  const downloadStudentsCSV = () => {
    const rows = [["Name", "Email", "Phone", "Enrollment Date"]];
    students.forEach((s) => {
      rows.push([s.full_name, s.email, s.contact_number || "—", format(new Date(s.enrolled_at), "yyyy-MM-dd HH:mm")]);
    });
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${studentsCourseTitle}-students.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = useMemo(() => {
    const total = courses.length;
    const published = courses.filter((c) => c.is_published).length;
    const drafts = courses.filter((c) => !c.is_published && !c.requires_category_approval).length;
    const pending = courses.filter((c) => c.requires_category_approval).length;
    const students = Object.values(enrollCounts).reduce((a, b) => a + b, 0);
    return { total, published, drafts, pending, students };
  }, [courses, enrollCounts]);

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      if (filter === "published" && !c.is_published) return false;
      if (filter === "drafts" && (c.is_published || c.requires_category_approval)) return false;
      if (filter === "pending" && !c.requires_category_approval) return false;
      if (search) {
        const q = search.toLowerCase();
        return (c.title || "").toLowerCase().includes(q) || (c.category || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [courses, filter, search]);

  const getStatusBadge = (course: any) => {
    if (course.requires_category_approval) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-yellow-500/15 text-yellow-400 backdrop-blur-md border border-yellow-500/20">
          <Clock className="h-2.5 w-2.5" /> Pending
        </span>
      );
    }
    if (course.is_published) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium bg-primary/15 text-primary backdrop-blur-md border border-primary/30">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
          Live
        </span>
      );
    }
    if (course.approval_status === "approved") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-green-500/15 text-green-400 backdrop-blur-md border border-green-500/20">
          <CheckCircle className="h-2.5 w-2.5" /> Ready
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-muted/40 text-muted-foreground backdrop-blur-md border border-border">
        Draft
      </span>
    );
  };

  const statCards = [
    { label: "Total Courses", value: stats.total, icon: BookOpen, accent: "from-primary/20 to-primary/0" },
    { label: "Published", value: stats.published, icon: Eye, accent: "from-green-500/20 to-green-500/0" },
    { label: "Drafts", value: stats.drafts, icon: EyeOff, accent: "from-yellow-500/15 to-yellow-500/0" },
    { label: "Students", value: stats.students, icon: Users, accent: "from-primary/20 to-primary/0" },
  ];

  const filterPills: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "All", count: stats.total },
    { key: "published", label: "Published", count: stats.published },
    { key: "drafts", label: "Drafts", count: stats.drafts },
    { key: "pending", label: "Pending", count: stats.pending },
  ];

  if (loading) {
    return <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mt-8" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">My Courses</h2>
          <p className="mt-1 text-sm text-muted-foreground">Craft, publish and grow your learning catalog.</p>
        </div>
        <Link
          to="/coach/courses/new"
          className="group relative inline-flex items-center gap-2 self-start overflow-hidden rounded-xl bg-gradient-to-br from-primary via-primary to-primary/80 px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6)] transition-all hover:shadow-[0_12px_32px_-8px_hsl(var(--primary)/0.8)] hover:-translate-y-0.5 active:translate-y-0"
        >
          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          <Plus className="h-4 w-4" /> Create Course
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map(({ label, value, icon: Icon, accent }) => (
          <div
            key={label}
            className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_10px_30px_-12px_hsl(var(--primary)/0.4)]"
          >
            <div className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${accent} blur-2xl`} />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="mt-1 font-display text-2xl font-bold text-foreground">{value}</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-background/60 p-2 text-primary">
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses..."
            className="w-full rounded-xl border border-border bg-card/40 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 backdrop-blur-sm transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {filterPills.map((p) => {
            const active = filter === p.key;
            return (
              <button
                key={p.key}
                onClick={() => setFilter(p.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.6)]"
                    : "border border-border bg-card/40 text-muted-foreground backdrop-blur-sm hover:border-primary/30 hover:text-foreground"
                }`}
              >
                {p.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${active ? "bg-primary-foreground/20" : "bg-muted/50"}`}>
                  {p.count}
                </span>
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-0.5 rounded-full border border-border bg-card/40 p-0.5 backdrop-blur-sm lg:ml-2">
            <button
              onClick={() => setView("grid")}
              className={`rounded-full p-1.5 transition-colors ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setView("list")}
              className={`rounded-full p-1.5 transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              aria-label="List view"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Students Dialog */}
      <Dialog open={!!showStudents} onOpenChange={(o) => { if (!o) setShowStudents(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Enrolled Students ({students.length})</DialogTitle>
              {students.length > 0 && (
                <Button size="sm" variant="outline" onClick={downloadStudentsCSV} className="gap-1.5">
                  <Download className="h-3.5 w-3.5" /> Download CSV
                </Button>
              )}
            </div>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">{studentsCourseTitle}</p>
          {students.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No enrollments yet</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {students.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{s.full_name}</p>
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                    {s.contact_number && <p className="text-xs text-muted-foreground">{s.contact_number}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground">{format(new Date(s.enrolled_at), "MMM d, yyyy")}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/30 px-6 py-16 text-center backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute left-1/4 top-1/3 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
          </div>
          <div className="relative mx-auto max-w-sm">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.5)]">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="font-display text-xl font-bold text-foreground">
              {courses.length === 0 ? "Launch your first course" : "No courses match your filters"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {courses.length === 0
                ? "Turn your expertise into a structured learning experience. Use AI to draft your outline and thumbnail in minutes."
                : "Try clearing the search or switching to All to see everything."}
            </p>
            {courses.length === 0 && (
              <Link
                to="/coach/courses/new"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_8px_24px_-8px_hsl(var(--primary)/0.6)] transition-all hover:-translate-y-0.5"
              >
                <Plus className="h-4 w-4" /> Create with AI
              </Link>
            )}
          </div>
        </div>
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_18px_40px_-16px_hsl(var(--primary)/0.45)]"
            >
              {/* Image */}
              <div className="relative aspect-[16/10] overflow-hidden bg-secondary">
                {c.thumbnail_url && (c as any).thumbnail_status === "approved" ? (
                  <img
                    src={c.thumbnail_url}
                    alt={c.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : c.thumbnail_url ? (
                  <>
                    <img src={c.thumbnail_url} alt={c.title} className="h-full w-full object-cover opacity-40" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur-md ${
                        (c as any).thumbnail_status === "rejected"
                          ? "bg-destructive/80 text-destructive-foreground"
                          : "bg-yellow-500/80 text-primary-foreground"
                      }`}>
                        {(c as any).thumbnail_status === "rejected" ? "❌ Rejected" : "🟡 Under Review"}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                )}
                {/* gradient fade */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-card via-card/60 to-transparent" />

                {/* floating badges */}
                <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5">
                  <span className="rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-semibold text-primary backdrop-blur-md border border-primary/20">
                    {c.category}
                  </span>
                </div>
                <div className="absolute right-3 top-3 z-10">{getStatusBadge(c)}</div>
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col gap-3 p-4">
                <h3 className="font-display text-base font-semibold leading-snug text-foreground line-clamp-2">
                  {c.title}
                </h3>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="font-medium">{c.level}</span>
                  <span className="text-border">•</span>
                  <span>${Number(c.price_usd)}</span>
                  <span className="text-border">•</span>
                  <span>₹{Number(c.price_inr)}</span>
                </div>

                {c.requires_category_approval && (
                  <div className="flex items-start gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-400" />
                    <p className="text-xs text-yellow-400">Awaiting category approval from admin.</p>
                  </div>
                )}

                <button
                  onClick={() => viewStudents(c.id, c.title)}
                  className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
                >
                  <Users className="h-3.5 w-3.5" />
                  {enrollCounts[c.id] || 0} enrolled
                </button>

                <div className="mt-auto flex items-center gap-1 border-t border-border/60 pt-3 text-xs">
                  <Link
                    to={`/coach/courses/${c.id}/edit`}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Edit className="h-3 w-3" /> Edit
                  </Link>
                  <Link
                    to={`/coach/courses/${c.id}/curriculum`}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-primary transition-colors hover:bg-primary/10"
                  >
                    <ListTree className="h-3 w-3" /> Curriculum
                  </Link>
                  <button
                    onClick={() => togglePublish(c.id, c.is_published)}
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground ${
                      c.requires_category_approval && !c.is_published ? "cursor-not-allowed opacity-50" : ""
                    }`}
                    disabled={c.requires_category_approval && !c.is_published}
                  >
                    {c.is_published ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {c.is_published ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    onClick={() => deleteCourse(c.id)}
                    className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // LIST VIEW
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm">
          <div className="hidden grid-cols-12 gap-3 border-b border-border/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground lg:grid">
            <div className="col-span-5">Course</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Pricing</div>
            <div className="col-span-1">Students</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>
          <div className="divide-y divide-border/60">
            {filtered.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-1 gap-3 px-4 py-3 transition-colors hover:bg-primary/[0.03] lg:grid-cols-12 lg:items-center"
              >
                <div className="col-span-5 flex items-center gap-3 min-w-0">
                  <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary">
                    {c.thumbnail_url ? (
                      <img src={c.thumbnail_url} alt={c.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <BookOpen className="h-4 w-4 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-semibold text-foreground">{c.title}</p>
                    <p className="truncate text-xs text-primary">{c.category} · {c.level}</p>
                  </div>
                </div>
                <div className="col-span-2">{getStatusBadge(c)}</div>
                <div className="col-span-2 text-xs text-muted-foreground">
                  ${Number(c.price_usd)} · ₹{Number(c.price_inr)}
                </div>
                <div className="col-span-1">
                  <button
                    onClick={() => viewStudents(c.id, c.title)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Users className="h-3 w-3" /> {enrollCounts[c.id] || 0}
                  </button>
                </div>
                <div className="col-span-2 flex items-center justify-end gap-1 text-xs">
                  <Link to={`/coach/courses/${c.id}/edit`} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground" title="Edit">
                    <Edit className="h-3.5 w-3.5" />
                  </Link>
                  <Link to={`/coach/courses/${c.id}/curriculum`} className="rounded-lg p-1.5 text-primary hover:bg-primary/10" title="Curriculum">
                    <ListTree className="h-3.5 w-3.5" />
                  </Link>
                  <button
                    onClick={() => togglePublish(c.id, c.is_published)}
                    disabled={c.requires_category_approval && !c.is_published}
                    className={`rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground ${
                      c.requires_category_approval && !c.is_published ? "cursor-not-allowed opacity-50" : ""
                    }`}
                    title={c.is_published ? "Unpublish" : "Publish"}
                  >
                    {c.is_published ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => deleteCourse(c.id)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CoachCourses;
