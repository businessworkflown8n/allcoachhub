import { useEffect, useMemo, useState } from "react";
import { useParams, Navigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSEO } from "@/hooks/useSEO";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CheckCircle2, Lock, PlayCircle, FileText, BookOpen, Users, ClipboardList, Award, ArrowLeft, ExternalLink, Link2, RotateCcw } from "lucide-react";
import QuizRunner from "@/components/learner/lms/QuizRunner";
import AssignmentPanel from "@/components/learner/lms/AssignmentPanel";
import LessonSidePanel from "@/components/learner/lms/LessonSidePanel";
import CourseUpcomingSessions from "@/components/learner/lms/CourseUpcomingSessions";
import { detectProvider, buildEmbedUrl, PROVIDER_LABELS } from "@/lib/lessonProviders";

type Lesson = any;
type Module = { id: string; title: string; sort_order: number; lessons: Lesson[] };

const TYPE_ICON: Record<string, any> = { video: PlayCircle, pdf: FileText, text: BookOpen, quiz: ClipboardList, assignment: ClipboardList, live: Users, external_link: Link2 };

function isYouTube(url: string) { return /youtube\.com|youtu\.be/.test(url); }
function isVimeo(url: string) { return /vimeo\.com/.test(url); }
function ytEmbed(url: string) {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : url;
}
function vimeoEmbed(url: string) {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? `https://player.vimeo.com/video/${m[1]}` : url;
}

const CoursePlayer = () => {
  const { courseId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMedia, setActiveMedia] = useState<any[]>([]);
  const [reviewKey, setReviewKey] = useState(0);

  useSEO({ title: course ? `${course.title} – Learn` : "Course Player", noIndex: true });

  const loadCurriculum = async (initial = false) => {
    if (!user || !courseId) return;
    if (initial) {
      const { data: c } = await supabase.from("courses").select("*").eq("id", courseId).single();
      setCourse(c);
      const { data: e } = await supabase.from("enrollments").select("*").eq("course_id", courseId).eq("learner_id", user.id).maybeSingle();
      setEnrollment(e);
    }
    const { data: mods } = await supabase.from("course_modules").select("*").eq("course_id", courseId).eq("is_published", true).order("sort_order");
    const ids = (mods || []).map((m: any) => m.id);
    const { data: lessons } = ids.length
      ? await supabase.from("course_lessons").select("*").in("module_id", ids).eq("is_published", true).order("sort_order")
      : { data: [] };
    const grouped: Module[] = (mods || []).map((m: any) => ({ ...m, lessons: (lessons || []).filter((l: any) => l.module_id === m.id) }));
    setModules(grouped);
    if (initial) {
      const { data: prog } = await supabase.from("lesson_progress").select("lesson_id").eq("learner_id", user.id).eq("course_id", courseId);
      setCompletedIds(new Set((prog || []).map((p: any) => p.lesson_id)));
      const { data: enr } = await supabase.from("enrollments").select("last_accessed_lesson_id, payment_status, enrolled_at").eq("course_id", courseId).eq("learner_id", user.id).maybeSingle();
      const all = grouped.flatMap((m) => m.lessons);
      const last = enr?.last_accessed_lesson_id && all.find((l: any) => l.id === enr.last_accessed_lesson_id && isUnlocked(l, enr));
      const firstUnlocked = last || all.find((l: any) => isUnlocked(l, enr));
      setActiveId(firstUnlocked?.id || null);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurriculum(true);
    if (!user || !courseId) return;
    // Realtime: re-fetch curriculum when coach adds/edits modules or lessons
    const ch = supabase
      .channel(`course-curriculum-${courseId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "course_modules", filter: `course_id=eq.${courseId}` }, () => loadCurriculum(false))
      .on("postgres_changes", { event: "*", schema: "public", table: "course_lessons" }, () => loadCurriculum(false))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, courseId]);

  const isUnlocked = (l: any, enr: any) => {
    if (l.is_free_preview) return true;
    if (!enr || enr.payment_status !== "completed") return false;
    if (!l.drip_days) return true;
    const enrolledAt = new Date(enr.enrolled_at).getTime();
    return Date.now() >= enrolledAt + l.drip_days * 86400000;
  };

  const allLessons = useMemo(() => modules.flatMap((m) => m.lessons), [modules]);
  const active = useMemo(() => allLessons.find((l) => l.id === activeId), [allLessons, activeId]);

  useEffect(() => {
    if (!activeId) { setActiveMedia([]); return; }
    supabase.from("lecture_media").select("*").eq("lesson_id", activeId).order("sort_order")
      .then(({ data }) => setActiveMedia(data || []));
    // Track last accessed lesson for Continue Learning
    if (user && courseId && enrollment) {
      supabase.from("enrollments")
        .update({ last_accessed_lesson_id: activeId, last_accessed_at: new Date().toISOString() })
        .eq("learner_id", user.id).eq("course_id", courseId)
        .then(() => {});
    }
  }, [activeId, user, courseId, enrollment]);

  const markComplete = async () => {
    if (!user || !active || !courseId) return;
    if (completedIds.has(active.id)) return;
    const { error } = await supabase.from("lesson_progress").insert({ learner_id: user.id, course_id: courseId, lesson_id: active.id });
    if (error && !error.message.includes("duplicate")) {
      toast({ title: "Could not mark complete", description: error.message, variant: "destructive" });
      return;
    }
    const next = new Set(completedIds); next.add(active.id); setCompletedIds(next);
    const { data: pct } = await supabase.rpc("recompute_course_progress", { _learner: user.id, _course: courseId });
    setEnrollment((e: any) => ({ ...e, progress_percent: pct }));
    // Award XP + update streak (fire-and-forget)
    supabase.rpc("award_xp" as any, { _user_id: user.id, _points: 10, _source: "lesson_complete", _source_id: active.id, _course_id: courseId });
    supabase.rpc("update_learner_streak" as any, { _user_id: user.id });
    toast({ title: "Lesson complete ✓ +10 XP" });
    if (Number(pct) >= 100) {
      supabase.rpc("award_xp" as any, { _user_id: user.id, _points: 100, _source: "course_complete", _source_id: null, _course_id: courseId });
      supabase.functions.invoke("generate-certificate", { body: { course_id: courseId } }).then(({ data, error: cErr }) => {
        if (!cErr && data?.pdf_url) toast({ title: "🎓 Certificate ready! +100 XP", description: "View it from My Certificates." });
      });
      // Fire-and-forget course completion email + in-app notification (idempotent server-side)
      supabase.functions.invoke("course-completion-email", { body: { course_id: courseId } }).catch(() => {});
    }
    // Auto-advance
    const idx = allLessons.findIndex((l) => l.id === active.id);
    const nextLesson = allLessons.slice(idx + 1).find((l) => isUnlocked(l, enrollment));
    if (nextLesson) setActiveId(nextLesson.id);
  };

  if (authLoading || loading) return <div className="flex h-screen items-center justify-center bg-background"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!user) return <Navigate to={`/auth?mode=login&redirect=/learn/${courseId}`} replace />;
  if (!enrollment || enrollment.payment_status !== "completed") {
    if (!allLessons.some((l: any) => l.is_free_preview)) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="rounded-2xl border border-border bg-card p-8 max-w-md text-center">
            <Lock className="h-10 w-10 mx-auto text-primary mb-3" />
            <h2 className="text-xl font-bold">Enrollment Required</h2>
            <p className="text-sm text-muted-foreground mt-2">Enroll in this course to access the lessons.</p>
            <Link to={`/course/${course?.slug || courseId}`}><Button className="mt-4">View Course</Button></Link>
          </div>
        </div>
      );
    }
  }

  const pct = Number(enrollment?.progress_percent || 0);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-80 shrink-0 border-r border-border bg-card overflow-y-auto sticky top-0 h-screen">
        <div className="p-4 border-b border-border">
          <Link to="/learner/courses" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> My Courses</Link>
          <h2 className="mt-2 font-bold text-foreground line-clamp-2">{course?.title}</h2>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-semibold text-primary">{pct}%</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
        {courseId && (
          <div className="p-3 border-b border-border">
            <CourseUpcomingSessions courseId={courseId} />
          </div>
        )}
        <div className="p-2 space-y-3">
          {modules.map((m) => (
            <div key={m.id}>
              <p className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{m.title}</p>
              <div className="space-y-0.5">
                {m.lessons.map((l: any) => {
                  const Icon = TYPE_ICON[l.content_type] || BookOpen;
                  const unlocked = isUnlocked(l, enrollment);
                  const done = completedIds.has(l.id);
                  return (
                    <button
                      key={l.id}
                      onClick={() => unlocked && setActiveId(l.id)}
                      disabled={!unlocked}
                      className={`w-full flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors ${activeId === l.id ? "bg-primary/15 text-primary" : "hover:bg-secondary text-foreground"} ${!unlocked ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {done ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0" /> : !unlocked ? <Lock className="h-4 w-4 shrink-0" /> : <Icon className="h-4 w-4 shrink-0" />}
                      <span className="flex-1 truncate">{l.title}</span>
                      {l.drip_days > 0 && !unlocked && <span className="text-[10px] text-muted-foreground">D{l.drip_days}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {pct >= 100 && (
          <div className="p-4 border-t border-border">
            <Link to="/learner/certificates" className="flex items-center gap-2 rounded-lg bg-primary/15 p-3 text-sm font-semibold text-primary hover:bg-primary/25">
              <Award className="h-5 w-5" /> View Certificate
            </Link>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        {!active ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">Select a lesson to start</div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-6">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{active.content_type}</p>
              <h1 className="text-2xl font-bold mt-1">{active.title}</h1>
            </div>

            {/* Video */}
            {active.content_type === "video" && active.content_url && (
              isYouTube(active.content_url) ? (
                <iframe key={`v-${active.id}-${reviewKey}`} src={ytEmbed(active.content_url)} className="aspect-video w-full rounded-xl" allowFullScreen title={active.title} />
              ) : isVimeo(active.content_url) ? (
                <iframe key={`v-${active.id}-${reviewKey}`} src={vimeoEmbed(active.content_url)} className="aspect-video w-full rounded-xl" allowFullScreen title={active.title} />
              ) : (
                <video key={`v-${active.id}-${reviewKey}`} src={active.content_url} controls className="aspect-video w-full rounded-xl bg-black" />
              )
            )}

            {/* PDF */}
            {active.content_type === "pdf" && active.content_url && (
              <iframe src={active.content_url} className="w-full h-[70vh] rounded-xl border border-border" title={active.title} />
            )}

            {/* Text / assignment brief */}
            {(active.content_type === "text" || active.content_type === "assignment") && (
              <div className="prose prose-invert max-w-none rounded-xl border border-border bg-card p-6">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{active.content_text || "_(no content)_"}</ReactMarkdown>
              </div>
            )}

            {/* External Link lesson */}
            {active.content_type === "external_link" && active.content_url && (() => {
              const provider = (active.provider as any) || detectProvider(active.content_url);
              const embed = buildEmbedUrl(active.content_url, provider);
              const canEmbed = ["youtube", "vimeo", "loom", "google_drive", "google_docs", "google_sheets", "google_slides", "canva", "pdf"].includes(provider);
              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Link2 className="h-3 w-3" /> Source: <span className="text-foreground font-medium">{PROVIDER_LABELS[provider as keyof typeof PROVIDER_LABELS] || "External"}</span>
                  </div>
                  {canEmbed && embed ? (
                    <iframe src={embed} className={provider === "pdf" ? "w-full h-[70vh] rounded-xl border border-border" : "aspect-video w-full rounded-xl border border-border"} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={active.title} />
                  ) : (
                    <a href={active.content_url} target="_blank" rel="noreferrer">
                      <Button><ExternalLink className="h-4 w-4 mr-1" /> Open {PROVIDER_LABELS[provider as keyof typeof PROVIDER_LABELS] || "Link"}</Button>
                    </a>
                  )}
                </div>
              );
            })()}

            {/* Live */}
            {active.content_type === "live" && (
              <div className="rounded-xl border border-border bg-card p-6 space-y-3">
                <p className="text-sm">Scheduled: <strong>{active.live_session_starts_at ? new Date(active.live_session_starts_at).toLocaleString() : "TBA"}</strong></p>
                {active.live_session_url ? (
                  <a href={active.live_session_url} target="_blank" rel="noreferrer">
                    <Button><Users className="h-4 w-4 mr-1" /> Join Live Session</Button>
                  </a>
                ) : <p className="text-sm text-muted-foreground">Link will be shared by the coach.</p>}
              </div>
            )}

            {/* Quiz (lesson-attached) */}
            <QuizRunner lessonId={active.id} hideIfEmpty={active.content_type !== "quiz"} />

            {/* Module assignments */}
            <AssignmentPanel courseId={courseId!} moduleId={active.module_id} hideIfEmpty />

            {/* Attached lecture media */}
            {activeMedia.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Lesson Media</h3>
                {activeMedia.filter((m) => m.media_type === "video_upload" || m.media_type === "recording").map((m) => (
                  <div key={m.id} className="space-y-1">
                    {m.title && <p className="text-xs text-muted-foreground">{m.title}</p>}
                    <video src={m.video_url} controls className="aspect-video w-full rounded-xl bg-black" />
                  </div>
                ))}
                {activeMedia.filter((m) => m.media_type === "youtube").map((m) => (
                  <div key={m.id} className="space-y-1">
                    {m.title && <p className="text-xs text-muted-foreground">{m.title}</p>}
                    {m.youtube_mode === "redirect" ? (
                      <a href={m.youtube_url} target="_blank" rel="noreferrer">
                        <Button variant="outline"><PlayCircle className="h-4 w-4 mr-1" /> Watch on YouTube</Button>
                      </a>
                    ) : (
                      <iframe src={ytEmbed(m.youtube_url)} className="aspect-video w-full rounded-xl" allowFullScreen title={m.title || "YouTube"} />
                    )}
                  </div>
                ))}
                {activeMedia.filter((m) => m.media_type === "image").length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {activeMedia.filter((m) => m.media_type === "image").map((m) => (
                      <a key={m.id} href={m.image_url} target="_blank" rel="noreferrer" className="block">
                        <img src={m.image_url} alt={m.title || m.caption || "lesson image"} className="w-full h-40 object-cover rounded-lg border border-border" loading="lazy" />
                        {m.caption && <p className="text-xs text-muted-foreground mt-1">{m.caption}</p>}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">{active.duration_minutes ? `${active.duration_minutes} min` : ""}</p>
              <Button onClick={markComplete} disabled={completedIds.has(active.id)}>
                {completedIds.has(active.id) ? <><CheckCircle2 className="h-4 w-4 mr-1" /> Completed</> : "Mark as Complete"}
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Side panel: notes / resources / discussion */}
      {active && courseId && (
        <div className="hidden lg:flex h-screen sticky top-0 overflow-hidden">
          <LessonSidePanel courseId={courseId} lessonId={active.id} />
        </div>
      )}
    </div>
  );
};



export default CoursePlayer;
