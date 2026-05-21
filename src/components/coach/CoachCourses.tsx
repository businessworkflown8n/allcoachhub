import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { BookOpen, Plus, Edit, Trash2, Eye, EyeOff, Users, Download, X, Clock, CheckCircle, AlertTriangle, ListTree } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface EnrolledStudent {
  id: string;
  full_name: string;
  email: string;
  contact_number: string;
  enrolled_at: string;
}

const CoachCourses = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollCounts, setEnrollCounts] = useState<Record<string, number>>({});
  const [showStudents, setShowStudents] = useState<string | null>(null);
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [studentsCourseTitle, setStudentsCourseTitle] = useState("");

  const fetchCourses = async () => {
    if (!user) return;
    const { data } = await supabase.from("courses").select("*").eq("coach_id", user.id).order("created_at", { ascending: false });
    setCourses(data || []);

    // Fetch enrollment counts
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
    // Check if course requires category approval before publishing
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

  const getStatusBadge = (course: any) => {
    if (course.requires_category_approval) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400">
          <Clock className="h-3 w-3" /> Pending Category Approval
        </span>
      );
    }
    if (course.approval_status === "approved" && !course.is_published) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-green-500/20 text-green-400">
          <CheckCircle className="h-3 w-3" /> Ready to Publish
        </span>
      );
    }
    if (course.is_published) {
      return <span className="rounded-full px-2 py-0.5 text-xs bg-green-500/20 text-green-400">Published</span>;
    }
    return <span className="rounded-full px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400">Draft</span>;
  };

  if (loading) return <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mt-8" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">My Courses</h2>
        <Link to="/coach/courses/new" className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110">
          <Plus className="h-4 w-4" /> Add Course
        </Link>
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

      {courses.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No courses yet</h3>
          <p className="text-sm text-muted-foreground">Create your first course to start teaching</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-card overflow-hidden space-y-0">
              {c.thumbnail_url && (c as any).thumbnail_status === "approved" ? (
                <img src={c.thumbnail_url} alt={c.title} className="w-full h-32 object-cover" />
              ) : c.thumbnail_url ? (
                <div className="relative w-full h-32">
                  <img src={c.thumbnail_url} alt={c.title} className="w-full h-32 object-cover opacity-50" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur-sm ${
                      (c as any).thumbnail_status === "rejected"
                        ? "bg-destructive/80 text-destructive-foreground"
                        : "bg-yellow-500/80 text-primary-foreground"
                    }`}>
                      {(c as any).thumbnail_status === "rejected" ? "❌ Rejected" : "🟡 Under Review"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-full h-32 bg-secondary flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-muted-foreground/40" />
                </div>
              )}
              <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-primary">{c.category}</span>
                {getStatusBadge(c)}
              </div>
              <h3 className="text-sm font-bold text-foreground">{c.title}</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{c.level}</span> · <span>${Number(c.price_usd)}</span> · <span>₹{Number(c.price_inr)}</span>
              </div>

              {/* Pending category approval message */}
              {c.requires_category_approval && (
                <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-yellow-400">
                    Awaiting category approval from admin. You'll be notified once approved.
                  </p>
                </div>
              )}

              {/* Enrollment count */}
              <button
                onClick={() => viewStudents(c.id, c.title)}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <Users className="h-3.5 w-3.5" />
                {enrollCounts[c.id] || 0} Students Enrolled
              </button>
              <div className="flex gap-2 pt-2 border-t border-border">
                <Link to={`/coach/courses/${c.id}/edit`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <Edit className="h-3 w-3" /> Edit
                </Link>
                <Link to={`/coach/courses/${c.id}/curriculum`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                  <ListTree className="h-3 w-3" /> Curriculum
                </Link>
                <button
                  onClick={() => togglePublish(c.id, c.is_published)}
                  className={`flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground ${c.requires_category_approval ? "opacity-50 cursor-not-allowed" : ""}`}
                  disabled={c.requires_category_approval && !c.is_published}
                >
                  {c.is_published ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {c.is_published ? "Unpublish" : "Publish"}
                </button>
                <button onClick={() => deleteCourse(c.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive ml-auto">
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CoachCourses;
