import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, Video, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Session {
  id: string;
  title: string;
  agenda: string | null;
  session_type: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string | null;
  status: string;
}

/**
 * Upcoming live sessions linked to this course.
 * RLS allows enrolled learners to view sessions via learner_enrolled_in_course().
 */
export default function CourseUpcomingSessions({ courseId }: { courseId: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("coach_sessions")
      .select("id, title, agenda, session_type, scheduled_at, duration_minutes, meeting_url, status")
      .eq("course_id", courseId)
      .eq("status", "scheduled")
      .gte("scheduled_at", new Date().toISOString())
      .order("scheduled_at", { ascending: true });
    setSessions((data || []) as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`course-sessions-${courseId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coach_sessions", filter: `course_id=eq.${courseId}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  if (loading) return null;
  if (!sessions.length) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Upcoming Live Sessions</h3>
        <Badge variant="secondary" className="text-[10px]">{sessions.length}</Badge>
      </div>
      <div className="space-y-2">
        {sessions.map((s) => {
          const start = new Date(s.scheduled_at);
          const diffMin = (start.getTime() - Date.now()) / 60000;
          const isLive = diffMin <= 5 && diffMin > -s.duration_minutes;
          return (
            <div key={s.id} className="rounded-lg border border-border bg-background p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-foreground line-clamp-2">{s.title}</p>
                {isLive ? <Badge className="bg-red-500/15 text-red-400 border-red-500/30">LIVE</Badge> : <Badge variant="outline" className="text-[10px]">{s.session_type.replace("_", " ")}</Badge>}
              </div>
              {s.agenda && <p className="text-xs text-muted-foreground line-clamp-2">{s.agenda}</p>}
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{start.toLocaleString()}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.duration_minutes}m</span>
              </div>
              {s.meeting_url && (
                <a href={s.meeting_url} target="_blank" rel="noreferrer">
                  <Button size="sm" variant={isLive ? "default" : "outline"} className="w-full">
                    <Video className="h-3 w-3 mr-1" /> {isLive ? "Join Now" : "Join"} <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
