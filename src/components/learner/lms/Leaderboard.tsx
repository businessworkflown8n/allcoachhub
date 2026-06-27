import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Trophy, Medal } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const Leaderboard = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any).rpc("get_xp_leaderboard", { _limit: 20 });
      setRows(
        (data || []).map((r: any) => ({
          user_id: r.user_id,
          total_xp: r.total_xp,
          level: r.level,
          profile: { full_name: r.full_name, avatar_url: r.avatar_url },
        }))
      );
      setLoading(false);
    })();
  }, []);

  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-semibold flex items-center gap-2 mb-4"><Trophy className="h-5 w-5 text-yellow-400" /> Leaderboard</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No XP earned yet. Complete a lesson to appear here!</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r, i) => {
            const me = user?.id === r.user_id;
            return (
              <div key={r.user_id} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${me ? "bg-primary/10 border border-primary/30" : "hover:bg-secondary/50"}`}>
                <span className="w-6 text-center font-bold text-sm">
                  {i === 0 ? <Medal className="h-4 w-4 text-yellow-400 inline" /> : i === 1 ? <Medal className="h-4 w-4 text-gray-300 inline" /> : i === 2 ? <Medal className="h-4 w-4 text-amber-700 inline" /> : i + 1}
                </span>
                {r.profile?.avatar_url ? (
                  <img src={r.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs">{(r.profile?.full_name || "?").charAt(0)}</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.profile?.full_name || "Learner"} {me && <span className="text-xs text-primary">(You)</span>}</p>
                  <p className="text-xs text-muted-foreground">Level {r.level}</p>
                </div>
                <span className="text-sm font-mono font-semibold text-primary">{r.total_xp} XP</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
