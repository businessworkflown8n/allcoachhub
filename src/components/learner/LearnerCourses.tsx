import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { BookOpen, Clock, PlayCircle } from "lucide-react";

const LearnerCourses = () => {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase.from("enrollments").select("*, courses(*)").eq("learner_id", user.id);
      setEnrollments(data || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) return <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mt-8" />;

  if (enrollments.length === 0) {
    return (
      <div className="text-center py-16">
        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground">No courses yet</h3>
        <p className="text-sm text-muted-foreground mt-1">Browse courses and enroll to get started</p>
        <Link to="/" className="mt-4 inline-block rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110">
          Browse Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">My Courses</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {enrollments.map((e) => (
          <div key={e.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <span className="text-xs text-primary">{(e.courses as any)?.category}</span>
            <h3 className="text-sm font-bold text-foreground">{(e.courses as any)?.title}</h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" /> {Number((e.courses as any)?.duration_hours)} hours
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="text-foreground font-medium">{Number(e.progress_percent)}%</span>
              </div>
              <div className="h-2 rounded-full bg-secondary">
                <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${Number(e.progress_percent)}%` }} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                e.payment_status === "completed" || e.payment_status === "paid" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
              }`}>
                {e.payment_status}
              </span>
              <Link to={`/learn/${e.course_id}`} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:brightness-110">
                <PlayCircle className="h-3.5 w-3.5" /> {Number(e.progress_percent) > 0 ? "Continue" : "Start"}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LearnerCourses;
