import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Medal, Trophy, Award } from "lucide-react";

interface Props { courseId: string; }

type Row = {
  user_id: string;
  total_score: number;
  completed_count: number;
  submitted_count: number;
  total_published: number;
  rank_position: number;
  last_submitted_at: string | null;
  full_name?: string | null;
};

const SORTS = [
  { key: "rank", label: "Highest Marks" },
  { key: "fastest", label: "Fastest Submission" },
  { key: "completion", label: "Completion Rate" },
] as const;

const CourseLeaderboard = ({ courseId }: Props) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [sort, setSort] = useState<typeof SORTS[number]["key"]>("rank");

  const load = async () => {
    setLoading(true);
    const { data: settings } = await (supabase as any)
      .from("assignment_leaderboard_settings")
      .select("is_enabled").eq("course_id", courseId).maybeSingle();
    if (settings && settings.is_enabled === false) {
      setEnabled(false); setLoading(false); return;
    }
    setEnabled(true);

    const { data: lb } = await (supabase as any)
      .from("course_leaderboard_v")
      .select("*")
      .eq("course_id", courseId)
      .order("rank_position", { ascending: true })
      .limit(50);

    const ids = (lb || []).map((r: any) => r.user_id);
    let names: Record<string, string> = {};
    if (ids.length) {
      const { data: ps } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      (ps || []).forEach((p: any) => { names[p.user_id] = p.full_name; });
    }
    setRows((lb || []).map((r: any) => ({ ...r, full_name: names[r.user_id] || "Learner" })));
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [courseId]);

  // realtime refresh on submissions changes
  useEffect(() => {
    const ch = supabase.channel(`lb-${courseId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "assignment_submissions" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [courseId]);

  const sorted = [...rows].sort((a, b) => {
    if (sort === "fastest") {
      return new Date(a.last_submitted_at || 0).getTime() - new Date(b.last_submitted_at || 0).getTime();
    }
    if (sort === "completion") {
      const ac = a.total_published ? a.completed_count / a.total_published : 0;
      const bc = b.total_published ? b.completed_count / b.total_published : 0;
      return bc - ac;
    }
    return a.rank_position - b.rank_position;
  });

  if (loading) return <Skeleton className="h-32 w-full" />;
  if (!enabled) return <p className="text-sm text-muted-foreground">Leaderboard is disabled for this course.</p>;
  if (!rows.length) return <p className="text-sm text-muted-foreground">No submissions yet — be the first to earn a spot!</p>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {SORTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={`text-xs rounded-full px-3 py-1 border ${sort === s.key ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary/40 text-muted-foreground"}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr className="text-left">
              <th className="py-2 pr-2">Rank</th>
              <th className="py-2 pr-2">Learner</th>
              <th className="py-2 pr-2">Marks</th>
              <th className="py-2 pr-2">Completion</th>
              <th className="py-2 pr-2">Last Submitted</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, idx) => {
              const isMe = r.user_id === user?.id;
              const displayRank = sort === "rank" ? r.rank_position : idx + 1;
              const completionPct = r.total_published ? Math.round((r.completed_count / r.total_published) * 100) : 0;
              const Icon = displayRank === 1 ? Trophy : displayRank === 2 ? Medal : displayRank === 3 ? Award : null;
              return (
                <tr key={r.user_id} className={`border-t border-border/40 ${isMe ? "bg-primary/5" : ""}`}>
                  <td className="py-2 pr-2">
                    <span className="inline-flex items-center gap-1 font-semibold">
                      {Icon && <Icon className={`h-4 w-4 ${displayRank === 1 ? "text-yellow-500" : displayRank === 2 ? "text-slate-300" : "text-amber-600"}`} />}
                      #{displayRank}
                    </span>
                  </td>
                  <td className="py-2 pr-2">{r.full_name}{isMe && <span className="ml-1 text-[10px] text-primary">(you)</span>}</td>
                  <td className="py-2 pr-2 font-semibold text-foreground">{r.total_score}</td>
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 rounded bg-secondary overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${completionPct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">{completionPct}%</span>
                    </div>
                  </td>
                  <td className="py-2 pr-2 text-xs text-muted-foreground">{r.last_submitted_at ? new Date(r.last_submitted_at).toLocaleString() : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CourseLeaderboard;
