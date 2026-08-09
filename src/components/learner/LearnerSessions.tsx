import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/compatClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Video, FileText, Paperclip, ExternalLink, Search, PlayCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface Session {
  id: string;
  coach_id: string;
  course_id: string | null;
  title: string;
  topic: string | null;
  description: string | null;
  tags: string[] | null;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string | null;
  status: string;
  thumbnail_url: string | null;
  coach_name?: string;
  course_title?: string;
  recordings_count?: number;
  notes_count?: number;
  resources_count?: number;
}

const PAGE_TABS = ["upcoming", "live", "completed", "all"] as const;
type PageTab = typeof PAGE_TABS[number];

export default function LearnerSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<PageTab>("upcoming");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [coachFilter, setCoachFilter] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<string>("any");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [openDetails, setOpenDetails] = useState<Session | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);

    // Step 1: enrolled course IDs
    const { data: enr } = await supabase
      .from("enrollments")
      .select("course_id")
      .eq("learner_id", user.id);
    const courseIds = [...new Set((enr || []).map((e: any) => e.course_id).filter(Boolean))];
    if (courseIds.length === 0) { setSessions([]); setLoading(false); return; }

    // Step 2: sessions for those courses
    const { data: ss } = await supabase
      .from("coach_sessions")
      .select("id, coach_id, course_id, title, topic, description, tags, scheduled_at, duration_minutes, meeting_url, status, thumbnail_url")
      .in("course_id", courseIds)
      .order("scheduled_at", { ascending: false });

    const list = (ss || []) as Session[];
    if (list.length === 0) { setSessions([]); setLoading(false); return; }

    const coachIds = [...new Set(list.map((s) => s.coach_id))];
    const cIds = [...new Set(list.map((s) => s.course_id).filter(Boolean))] as string[];
    const sessionIds = list.map((s) => s.id);

    const [{ data: profs }, { data: courses }, { data: recs }, { data: notes }, { data: res }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name").in("user_id", coachIds),
      supabase.from("courses").select("id, title").in("id", cIds),
      supabase.from("session_recordings").select("session_id").in("session_id", sessionIds),
      supabase.from("coach_session_notes").select("session_id").in("session_id", sessionIds).eq("client_visible", true),
      supabase.from("session_resources").select("session_id").in("session_id", sessionIds),
    ]);

    const pMap = new Map((profs || []).map((p: any) => [p.user_id, p.full_name]));
    const cMap = new Map((courses || []).map((c: any) => [c.id, c.title]));
    const tally = (arr: any[] | null) => {
      const m: Record<string, number> = {};
      for (const r of arr || []) m[r.session_id] = (m[r.session_id] || 0) + 1;
      return m;
    };
    const rMap = tally(recs); const nMap = tally(notes); const reMap = tally(res);

    setSessions(list.map((s) => ({
      ...s,
      coach_name: pMap.get(s.coach_id) || "Coach",
      course_title: s.course_id ? cMap.get(s.course_id) || "" : "",
      recordings_count: rMap[s.id] || 0,
      notes_count: nMap[s.id] || 0,
      resources_count: reMap[s.id] || 0,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const courseOpts = useMemo(() => {
    const m = new Map<string, string>();
    sessions.forEach((s) => { if (s.course_id) m.set(s.course_id, s.course_title || ""); });
    return Array.from(m.entries());
  }, [sessions]);
  const coachOpts = useMemo(() => {
    const m = new Map<string, string>();
    sessions.forEach((s) => m.set(s.coach_id, s.coach_name || ""));
    return Array.from(m.entries());
  }, [sessions]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const wkEnd = now + 7 * 86400000;
    const mEnd = now + 30 * 86400000;
    const q = search.trim().toLowerCase();

    let out = sessions.filter((s) => {
      const t = new Date(s.scheduled_at).getTime();
      if (tab === "upcoming" && !(s.status === "scheduled" && t >= now)) return false;
      if (tab === "live" && s.status !== "live" && !(s.status === "scheduled" && t <= now && t + s.duration_minutes * 60000 >= now)) return false;
      if (tab === "completed" && s.status !== "completed") return false;
      if (courseFilter !== "all" && s.course_id !== courseFilter) return false;
      if (coachFilter !== "all" && s.coach_id !== coachFilter) return false;
      if (timeFilter === "week" && (t < now || t > wkEnd)) return false;
      if (timeFilter === "month" && (t < now || t > mEnd)) return false;
      if (q) {
        const blob = [s.title, s.topic, s.description, s.coach_name, s.course_title, (s.tags || []).join(" ")]
          .filter(Boolean).join(" ").toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });

    out = [...out].sort((a, b) => {
      const ta = new Date(a.scheduled_at).getTime();
      const tb = new Date(b.scheduled_at).getTime();
      if (sortBy === "oldest") return ta - tb;
      return tb - ta;
    });
    return out;
  }, [sessions, tab, search, courseFilter, coachFilter, timeFilter, sortBy]);

  const recordAccess = async (s: Session, kind: "join" | "notes" | "recording") => {
    if (!user) return;
    const patch: any = { learner_id: user.id, session_id: s.id, last_viewed_at: new Date().toISOString() };
    if (kind === "join") patch.joined_at = new Date().toISOString();
    if (kind === "notes") patch.viewed_notes = true;
    if (kind === "recording") patch.watched_recording = true;
    await supabase.from("learner_session_access").upsert(patch, { onConflict: "learner_id,session_id" });
  };

  const isLive = (s: Session) => {
    const t = new Date(s.scheduled_at).getTime();
    const end = t + s.duration_minutes * 60000;
    return s.status === "live" || (s.status === "scheduled" && t <= Date.now() && end >= Date.now());
  };

  const SessionCard = ({ s }: { s: Session }) => {
    const live = isLive(s);
    return (
      <Card className="overflow-hidden hover:shadow-lg transition-shadow border-border">
        <div className="aspect-video bg-muted relative">
          {s.thumbnail_url ? (
            <img src={s.thumbnail_url} alt={s.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
              <Video className="h-12 w-12 text-primary/40" />
            </div>
          )}
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {live && <Badge className="bg-red-500 text-white border-0">🔴 LIVE</Badge>}
            {(s.recordings_count || 0) > 0 && <Badge variant="secondary"><PlayCircle className="h-3 w-3 mr-1" />Recording</Badge>}
            {(s.notes_count || 0) > 0 && <Badge variant="secondary"><FileText className="h-3 w-3 mr-1" />Notes</Badge>}
          </div>
          <div className="absolute bottom-2 right-2">
            <Badge variant="outline" className="bg-background/80"><Clock className="h-3 w-3 mr-1" />{s.duration_minutes}m</Badge>
          </div>
        </div>
        <CardContent className="p-4 space-y-2">
          {s.topic && <p className="text-xs text-primary font-medium uppercase tracking-wide">{s.topic}</p>}
          <h3 className="font-semibold text-foreground line-clamp-2">{s.title}</h3>
          <p className="text-xs text-muted-foreground">by {s.coach_name} · {s.course_title}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />{format(new Date(s.scheduled_at), "MMM dd, yyyy · HH:mm")}
          </div>
          {(s.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {(s.tags || []).slice(0, 4).map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            {live && s.meeting_url && (
              <Button size="sm" asChild onClick={() => recordAccess(s, "join")}>
                <a href={s.meeting_url} target="_blank" rel="noreferrer">Join Now</a>
              </Button>
            )}
            {!live && s.status === "scheduled" && s.meeting_url && (
              <Button size="sm" variant="outline" asChild onClick={() => recordAccess(s, "join")}>
                <a href={s.meeting_url} target="_blank" rel="noreferrer"><Video className="h-3 w-3 mr-1" />Join Link</a>
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => { setOpenDetails(s); }}>Details</Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" /> My Sessions
        </h2>
        <p className="text-sm text-muted-foreground">Live sessions, recordings, notes and resources from your courses</p>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by title, topic, coach, course, tag…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="md:w-44"><SelectValue placeholder="Course" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courseOpts.map(([id, t]) => <SelectItem key={id} value={id}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={coachFilter} onValueChange={setCoachFilter}>
          <SelectTrigger className="md:w-44"><SelectValue placeholder="Coach" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Coaches</SelectItem>
            {coachOpts.map(([id, n]) => <SelectItem key={id} value={id}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={timeFilter} onValueChange={setTimeFilter}>
          <SelectTrigger className="md:w-36"><SelectValue placeholder="Time" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any Time</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="md:w-36"><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as PageTab)}>
        <TabsList>
          {PAGE_TABS.map((t) => <TabsTrigger key={t} value={t} className="capitalize">{t}</TabsTrigger>)}
        </TabsList>
        <TabsContent value={tab} className="mt-6">
          {loading ? (
            <p className="text-center text-muted-foreground py-12">Loading sessions…</p>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-16 text-center">
              <Video className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No sessions found.</p>
              <p className="text-xs text-muted-foreground mt-1">Sessions from your enrolled courses will appear here automatically.</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((s) => <SessionCard key={s.id} s={s} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {openDetails && (
        <SessionDetailsDialog
          session={openDetails}
          onClose={() => setOpenDetails(null)}
          onAccess={recordAccess}
        />
      )}
    </div>
  );
}

function SessionDetailsDialog({ session, onClose, onAccess }: { session: Session; onClose: () => void; onAccess: (s: Session, k: "join"|"notes"|"recording") => void; }) {
  const [recs, setRecs] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [r, n, rr] = await Promise.all([
        supabase.from("session_recordings").select("*").eq("session_id", session.id).order("created_at"),
        supabase.from("coach_session_notes").select("*").eq("session_id", session.id).eq("client_visible", true),
        supabase.from("session_resources").select("*").eq("session_id", session.id).order("created_at"),
      ]);
      setRecs(r.data || []); setNotes(n.data || []); setResources(rr.data || []);
      setLoading(false);
    })();
  }, [session.id]);

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              {session.topic && <p className="text-xs text-primary font-medium uppercase">{session.topic}</p>}
              <h3 className="text-xl font-bold text-foreground">{session.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">by {session.coach_name} · {session.course_title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(session.scheduled_at), "EEEE, MMM dd, yyyy · HH:mm")} · {session.duration_minutes} min
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>

          {session.description && <p className="text-sm text-muted-foreground">{session.description}</p>}

          {(session.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {session.tags!.map((t) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
            </div>
          )}

          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
            <Tabs defaultValue="recordings">
              <TabsList>
                <TabsTrigger value="recordings">Recordings ({recs.length})</TabsTrigger>
                <TabsTrigger value="notes">Notes ({notes.length})</TabsTrigger>
                <TabsTrigger value="resources">Resources ({resources.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="recordings" className="mt-3 space-y-2">
                {recs.length === 0 ? <p className="text-sm text-muted-foreground py-4">No recordings yet.</p> :
                  recs.map((r) => (
                    <a key={r.id} href={r.recording_url} target="_blank" rel="noreferrer"
                      onClick={() => onAccess(session, "recording")}
                      className="flex items-center gap-2 rounded-lg border border-border p-3 hover:bg-muted/50">
                      <PlayCircle className="h-4 w-4 text-primary" />
                      <span className="flex-1 text-sm">{r.title}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                  ))}
              </TabsContent>
              <TabsContent value="notes" className="mt-3 space-y-2">
                {notes.length === 0 ? <p className="text-sm text-muted-foreground py-4">No notes shared yet.</p> :
                  notes.map((n) => (
                    <div key={n.id} className="rounded-lg border border-border p-3 space-y-2">
                      {n.title && <p className="font-medium text-sm">{n.title}</p>}
                      {n.summary && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.summary}</p>}
                      <div className="flex gap-2 flex-wrap">
                        {n.external_url && (
                          <a href={n.external_url} target="_blank" rel="noreferrer" onClick={() => onAccess(session, "notes")}>
                            <Button size="sm" variant="outline"><ExternalLink className="h-3 w-3 mr-1" />Open Link</Button>
                          </a>
                        )}
                        {n.file_url && (
                          <a href={n.file_url} target="_blank" rel="noreferrer" onClick={() => onAccess(session, "notes")}>
                            <Button size="sm" variant="outline"><FileText className="h-3 w-3 mr-1" />Open File</Button>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
              </TabsContent>
              <TabsContent value="resources" className="mt-3 space-y-2">
                {resources.length === 0 ? <p className="text-sm text-muted-foreground py-4">No resources yet.</p> :
                  resources.map((r) => (
                    <a key={r.id} href={r.external_url || r.file_url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 rounded-lg border border-border p-3 hover:bg-muted/50">
                      <Paperclip className="h-4 w-4 text-primary" />
                      <span className="flex-1 text-sm">{r.title}</span>
                      <Badge variant="outline" className="text-[10px]">{r.resource_type}</Badge>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                  ))}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
