import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Timer, RotateCcw, Trophy, ClipboardList } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  lessonId?: string;
  courseId?: string;
}

type Question = {
  id: string;
  question_text: string;
  question_type: "multiple_choice" | "true_false" | "multi_select" | "descriptive" | string;
  options: string[];
  correct_answer: string; // JSON or plain string for descriptive
  points: number;
};

const QuizRunner = ({ lessonId, courseId }: Props) => {
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<{ score: number; total: number; passed: boolean; details: any[] } | null>(null);
  const [taking, setTaking] = useState(false);

  useEffect(() => {
    (async () => {
      if (!lessonId && !courseId) { setLoading(false); return; }
      let q = supabase.from("quizzes").select("*").eq("is_published", true).limit(1);
      if (lessonId) q = q.eq("lesson_id", lessonId);
      else if (courseId) q = q.eq("course_id", courseId);
      const { data: qz } = await q.maybeSingle();
      setQuiz(qz);
      if (qz) {
        const { data: qs } = await supabase.from("quiz_questions").select("*").eq("quiz_id", qz.id).order("sort_order");
        setQuestions((qs || []) as any);
        if (user) {
          const { data: at } = await supabase.from("quiz_attempts").select("*").eq("quiz_id", qz.id).eq("user_id", user.id).order("started_at", { ascending: false });
          setAttempts(at || []);
        }
      }
      setLoading(false);
    })();
  }, [lessonId, courseId, user]);

  useEffect(() => {
    if (!taking || secondsLeft === null) return;
    if (secondsLeft <= 0) { handleSubmit(); return; }
    const t = setTimeout(() => setSecondsLeft((s) => (s ?? 0) - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, taking]);

  const totalPoints = useMemo(() => questions.reduce((s, q) => s + (q.points || 1), 0), [questions]);

  const start = () => {
    setAnswers({});
    setActiveAttempt(null);
    setTaking(true);
    if (quiz?.time_limit_minutes) setSecondsLeft(quiz.time_limit_minutes * 60);
  };

  const grade = (q: Question, ans: any): boolean => {
    if (ans === undefined || ans === null || ans === "") return false;
    if (q.question_type === "multi_select") {
      let correct: string[] = [];
      try { correct = JSON.parse(q.correct_answer); } catch { correct = String(q.correct_answer).split(",").map((s) => s.trim()); }
      const given: string[] = Array.isArray(ans) ? ans : [];
      return correct.length === given.length && correct.every((c) => given.includes(c));
    }
    if (q.question_type === "descriptive") {
      // Auto-pass descriptive (manual review). Award full points; coach can adjust.
      return String(ans).trim().length > 0;
    }
    return String(ans).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase();
  };

  const handleSubmit = async () => {
    if (!user || !quiz) return;
    setSubmitting(true);
    let score = 0;
    const details = questions.map((q) => {
      const correct = grade(q, answers[q.id]);
      if (correct) score += q.points || 1;
      return { question_id: q.id, answer: answers[q.id] ?? null, correct, points: q.points || 1 };
    });
    const passed = totalPoints > 0 && (score / totalPoints) * 100 >= (quiz.pass_percentage || 70);
    const { error } = await supabase.from("quiz_attempts").insert({
      quiz_id: quiz.id, user_id: user.id, score, total_points: totalPoints,
      passed, answers: details, completed_at: new Date().toISOString(),
    });
    setSubmitting(false);
    setSecondsLeft(null);
    setTaking(false);
    if (error) { toast({ title: "Could not save attempt", description: error.message, variant: "destructive" }); return; }
    setActiveAttempt({ score, total: totalPoints, passed, details });
    const { data: at } = await supabase.from("quiz_attempts").select("*").eq("quiz_id", quiz.id).eq("user_id", user.id).order("started_at", { ascending: false });
    setAttempts(at || []);
    toast({ title: passed ? "🎉 Passed!" : "Try again", description: `${score}/${totalPoints} points` });
  };

  if (loading) return <Skeleton className="h-40 w-full" />;
  if (!quiz) return <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground flex items-center gap-2"><ClipboardList className="h-4 w-4" /> No quiz attached to this {lessonId ? "lesson" : "course"}.</div>;

  const used = attempts.length;
  const max = quiz.max_attempts ?? 3;
  const exhausted = max && used >= max && !taking;
  const bestPassed = attempts.some((a) => a.passed);

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" /> {quiz.title}</h3>
          {quiz.description && <p className="text-sm text-muted-foreground mt-1">{quiz.description}</p>}
          <p className="text-xs text-muted-foreground mt-2">
            {questions.length} questions · Pass {quiz.pass_percentage}% · {quiz.time_limit_minutes ? `${quiz.time_limit_minutes} min` : "No time limit"} · Attempt {used}/{max}
          </p>
        </div>
        {bestPassed && <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary"><Trophy className="h-3 w-3" /> Passed</span>}
      </div>

      {taking && secondsLeft !== null && (
        <div className="flex items-center gap-2 text-sm font-mono"><Timer className="h-4 w-4 text-primary" /> {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}</div>
      )}

      {activeAttempt && !taking && (
        <div className={`rounded-lg p-4 ${activeAttempt.passed ? "bg-primary/10 border border-primary/30" : "bg-destructive/10 border border-destructive/30"}`}>
          <p className="font-semibold">{activeAttempt.passed ? "Passed ✓" : "Not passed"} — {activeAttempt.score}/{activeAttempt.total} pts</p>
        </div>
      )}

      {!taking && (
        <div className="flex gap-2">
          <Button onClick={start} disabled={!!exhausted}>{used > 0 ? <><RotateCcw className="h-4 w-4 mr-1" /> Retake Quiz</> : "Start Quiz"}</Button>
          {exhausted && <p className="text-xs text-destructive self-center">Max attempts reached</p>}
        </div>
      )}

      {taking && (
        <div className="space-y-5">
          {questions.map((q, idx) => (
            <div key={q.id} className="space-y-2">
              <p className="text-sm font-medium">{idx + 1}. {q.question_text} <span className="text-xs text-muted-foreground">({q.points} pt)</span></p>
              {q.question_type === "true_false" ? (
                <div className="flex gap-2">
                  {["true", "false"].map((v) => (
                    <button key={v} type="button" onClick={() => setAnswers((a) => ({ ...a, [q.id]: v }))}
                      className={`px-4 py-2 rounded-lg border text-sm capitalize ${answers[q.id] === v ? "bg-primary/15 border-primary text-primary" : "border-border hover:bg-secondary"}`}>{v}</button>
                  ))}
                </div>
              ) : q.question_type === "multi_select" ? (
                <div className="space-y-1">
                  {(q.options || []).map((opt) => {
                    const arr: string[] = answers[q.id] || [];
                    const checked = arr.includes(opt);
                    return (
                      <label key={opt} className="flex items-center gap-2 text-sm rounded-lg px-3 py-2 hover:bg-secondary cursor-pointer">
                        <input type="checkbox" checked={checked} onChange={() => {
                          setAnswers((a) => ({ ...a, [q.id]: checked ? arr.filter((x) => x !== opt) : [...arr, opt] }));
                        }} />
                        {opt}
                      </label>
                    );
                  })}
                </div>
              ) : q.question_type === "descriptive" ? (
                <textarea value={answers[q.id] || ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  rows={3} className="w-full rounded-lg border border-border bg-secondary/40 p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40" />
              ) : (
                <div className="space-y-1">
                  {(q.options || []).map((opt) => (
                    <label key={opt} className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 cursor-pointer ${answers[q.id] === opt ? "bg-primary/15 text-primary" : "hover:bg-secondary"}`}>
                      <input type="radio" name={q.id} checked={answers[q.id] === opt} onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))} />
                      {opt}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
          <Button onClick={handleSubmit} disabled={submitting}>{submitting ? "Submitting..." : "Submit Quiz"}</Button>
        </div>
      )}

      {!taking && attempts.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Past attempts</p>
          <div className="space-y-1">
            {attempts.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center justify-between text-xs rounded-lg bg-secondary/40 px-3 py-2">
                <span className="text-muted-foreground">{new Date(a.started_at).toLocaleString()}</span>
                <span className="flex items-center gap-2">
                  <span className="font-mono">{a.score}/{a.total_points}</span>
                  {a.passed ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizRunner;
