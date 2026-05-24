import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, ListChecks, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props { courseId: string; }

const QTYPES = [
  { v: "multiple_choice", l: "Multiple Choice" },
  { v: "true_false", l: "True / False" },
  { v: "multi_select", l: "Multi Select" },
  { v: "descriptive", l: "Short Answer" },
];

const CoachQuizzes = ({ courseId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [editingQuiz, setEditingQuiz] = useState<any | null>(null);
  const [questionEditor, setQuestionEditor] = useState<{ quizId: string; questions: any[] } | null>(null);

  const load = async () => {
    const { data } = await supabase.from("quizzes").select("*, quiz_questions(count)").eq("course_id", courseId).order("created_at");
    setItems(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [courseId]);

  const saveQuiz = async () => {
    if (!editingQuiz?.title) return toast({ title: "Title required", variant: "destructive" });
    const payload: any = {
      title: editingQuiz.title, description: editingQuiz.description,
      pass_percentage: editingQuiz.pass_percentage || 70,
      time_limit_minutes: editingQuiz.time_limit_minutes || null,
      max_attempts: editingQuiz.max_attempts || 3,
      is_published: !!editingQuiz.is_published,
      course_id: courseId,
    };
    const { error } = editingQuiz.id
      ? await supabase.from("quizzes").update(payload).eq("id", editingQuiz.id)
      : await supabase.from("quizzes").insert(payload);
    if (error) return toast({ title: error.message, variant: "destructive" });
    toast({ title: "Saved" }); setEditingQuiz(null); load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this quiz?")) return;
    await supabase.from("quizzes").delete().eq("id", id); load();
  };

  const openQuestions = async (q: any) => {
    const { data } = await supabase.from("quiz_questions").select("*").eq("quiz_id", q.id).order("sort_order");
    setQuestionEditor({ quizId: q.id, questions: data || [] });
  };

  if (loading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2"><ListChecks className="h-5 w-5 text-primary" /> Quizzes</h3>
        <Button size="sm" onClick={() => setEditingQuiz({ title: "", pass_percentage: 70, max_attempts: 3, is_published: true })}>
          <Plus className="h-4 w-4 mr-1" /> New Quiz
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No quizzes yet. Add one to test learner knowledge.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((q) => (
            <div key={q.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{q.title} {!q.is_published && <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[10px]">Draft</span>}</p>
                <p className="text-xs text-muted-foreground mt-1">{q.quiz_questions?.[0]?.count ?? 0} questions · Pass {q.pass_percentage}% · {q.time_limit_minutes ? `${q.time_limit_minutes} min` : "No limit"} · Max {q.max_attempts} attempts</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => openQuestions(q)}>Questions <ChevronRight className="h-3 w-3 ml-1" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingQuiz(q)}><Edit className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(q.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingQuiz && (
        <Dialog open onOpenChange={(o) => !o && setEditingQuiz(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editingQuiz.id ? "Edit" : "New"} Quiz</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Title" value={editingQuiz.title} onChange={(e) => setEditingQuiz({ ...editingQuiz, title: e.target.value })} />
              <textarea placeholder="Description" rows={2} value={editingQuiz.description || ""}
                onChange={(e) => setEditingQuiz({ ...editingQuiz, description: e.target.value })}
                className="w-full rounded-lg border border-border bg-secondary/40 p-2 text-sm" />
              <div className="grid grid-cols-3 gap-2">
                <div><label className="text-xs text-muted-foreground">Pass %</label>
                  <Input type="number" value={editingQuiz.pass_percentage} onChange={(e) => setEditingQuiz({ ...editingQuiz, pass_percentage: +e.target.value })} /></div>
                <div><label className="text-xs text-muted-foreground">Time (min)</label>
                  <Input type="number" value={editingQuiz.time_limit_minutes || ""} onChange={(e) => setEditingQuiz({ ...editingQuiz, time_limit_minutes: e.target.value ? +e.target.value : null })} /></div>
                <div><label className="text-xs text-muted-foreground">Max attempts</label>
                  <Input type="number" value={editingQuiz.max_attempts} onChange={(e) => setEditingQuiz({ ...editingQuiz, max_attempts: +e.target.value })} /></div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!editingQuiz.is_published} onChange={(e) => setEditingQuiz({ ...editingQuiz, is_published: e.target.checked })} />
                Published
              </label>
              <Button onClick={saveQuiz} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {questionEditor && (
        <Dialog open onOpenChange={(o) => !o && setQuestionEditor(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Questions</DialogTitle></DialogHeader>
            <QuestionsManager quizId={questionEditor.quizId} initial={questionEditor.questions} onChanged={() => load()} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

const QuestionsManager = ({ quizId, initial, onChanged }: any) => {
  const [list, setList] = useState<any[]>(initial);
  const [draft, setDraft] = useState<any>({ question_text: "", question_type: "multiple_choice", options: ["", "", "", ""], correct_answer: "", points: 1 });

  const reload = async () => {
    const { data } = await supabase.from("quiz_questions").select("*").eq("quiz_id", quizId).order("sort_order");
    setList(data || []); onChanged?.();
  };

  const addQuestion = async () => {
    if (!draft.question_text) return toast({ title: "Question text required", variant: "destructive" });
    const opts = draft.question_type === "true_false" ? ["true", "false"] : (draft.options || []).filter((o: string) => o.trim());
    const payload = {
      quiz_id: quizId,
      question_text: draft.question_text,
      question_type: draft.question_type,
      options: opts,
      correct_answer: String(draft.correct_answer || ""),
      points: draft.points || 1,
      sort_order: list.length,
    };
    const { error } = await supabase.from("quiz_questions").insert(payload);
    if (error) return toast({ title: error.message, variant: "destructive" });
    setDraft({ question_text: "", question_type: "multiple_choice", options: ["", "", "", ""], correct_answer: "", points: 1 });
    reload();
  };

  const remove = async (id: string) => {
    await supabase.from("quiz_questions").delete().eq("id", id); reload();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {list.map((q, i) => (
          <div key={q.id} className="rounded-lg border border-border bg-secondary/30 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">{i + 1}. {q.question_text} <span className="text-xs text-muted-foreground">({q.points}pt · {q.question_type})</span></p>
                {q.options?.length > 0 && (
                  <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
                    {q.options.map((o: string) => (
                      <li key={o} className={o === q.correct_answer ? "text-primary font-medium" : ""}>• {o}</li>
                    ))}
                  </ul>
                )}
                {q.question_type === "descriptive" && q.correct_answer && (
                  <p className="text-xs text-muted-foreground mt-1">Sample: {q.correct_answer}</p>
                )}
              </div>
              <Button size="sm" variant="ghost" onClick={() => remove(q.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-semibold">Add Question</p>
        <textarea placeholder="Question text" rows={2} value={draft.question_text}
          onChange={(e) => setDraft({ ...draft, question_text: e.target.value })}
          className="w-full rounded-lg border border-border bg-secondary/40 p-2 text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <select value={draft.question_type} onChange={(e) => setDraft({ ...draft, question_type: e.target.value, correct_answer: "" })}
            className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm">
            {QTYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
          <Input type="number" placeholder="Points" value={draft.points} onChange={(e) => setDraft({ ...draft, points: +e.target.value })} />
        </div>

        {draft.question_type === "multiple_choice" && (
          <div className="space-y-2">
            {draft.options.map((o: string, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" checked={draft.correct_answer === o && o !== ""} onChange={() => setDraft({ ...draft, correct_answer: o })} />
                <Input placeholder={`Option ${i + 1}`} value={o}
                  onChange={(e) => { const opts = [...draft.options]; opts[i] = e.target.value; setDraft({ ...draft, options: opts }); }} />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">Select the radio for the correct answer.</p>
          </div>
        )}
        {draft.question_type === "true_false" && (
          <div className="flex gap-2">
            {["true", "false"].map((v) => (
              <button key={v} type="button" onClick={() => setDraft({ ...draft, correct_answer: v })}
                className={`px-4 py-2 rounded-lg border text-sm capitalize ${draft.correct_answer === v ? "bg-primary/15 border-primary text-primary" : "border-border"}`}>{v}</button>
            ))}
          </div>
        )}
        {draft.question_type === "multi_select" && (
          <div className="space-y-2">
            {draft.options.map((o: string, i: number) => (
              <Input key={i} placeholder={`Option ${i + 1}`} value={o}
                onChange={(e) => { const opts = [...draft.options]; opts[i] = e.target.value; setDraft({ ...draft, options: opts }); }} />
            ))}
            <Input placeholder='Correct answers JSON e.g. ["A","B"]' value={draft.correct_answer}
              onChange={(e) => setDraft({ ...draft, correct_answer: e.target.value })} />
          </div>
        )}
        {draft.question_type === "descriptive" && (
          <Input placeholder="Sample / expected answer (optional, manual review)" value={draft.correct_answer}
            onChange={(e) => setDraft({ ...draft, correct_answer: e.target.value })} />
        )}

        <Button onClick={addQuestion} className="w-full"><Plus className="h-4 w-4 mr-1" /> Add Question</Button>
      </div>
    </div>
  );
};

export default CoachQuizzes;
