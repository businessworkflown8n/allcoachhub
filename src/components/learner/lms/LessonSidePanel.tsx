import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { FileText, MessageSquare, StickyNote, Trash2, ExternalLink, Send } from "lucide-react";

type Tab = "notes" | "resources" | "discussion";

interface Props {
  courseId: string;
  lessonId: string;
}

export default function LessonSidePanel({ courseId, lessonId }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("notes");
  const [notes, setNotes] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [discussions, setDiscussions] = useState<any[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [postDraft, setPostDraft] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!user || !lessonId) return;
    (async () => {
      const [{ data: n }, { data: r }, { data: d }] = await Promise.all([
        supabase.from("lesson_notes").select("*").eq("lesson_id", lessonId).eq("learner_id", user.id).order("created_at", { ascending: false }),
        supabase.from("lesson_resources").select("*").eq("lesson_id", lessonId).order("sort_order"),
        supabase.from("lesson_discussions").select("*").eq("lesson_id", lessonId).order("created_at", { ascending: true }),
      ]);
      setNotes(n || []);
      setResources(r || []);
      setDiscussions(d || []);
      // Hydrate profiles for discussion authors
      const uids = Array.from(new Set((d || []).map((x: any) => x.user_id)));
      if (uids.length) {
        const { data: profs } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", uids);
        const map = new Map((profs || []).map((p: any) => [p.user_id, p]));
        setDiscussions((d || []).map((x: any) => ({ ...x, _author: map.get(x.user_id) })));
      }
    })();
  }, [user, lessonId]);

  const addNote = async () => {
    if (!user || !noteDraft.trim()) return;
    const { data, error } = await supabase.from("lesson_notes").insert({
      learner_id: user.id, course_id: courseId, lesson_id: lessonId, body: noteDraft.trim(),
    }).select().single();
    if (error) return toast({ title: "Could not save note", description: error.message, variant: "destructive" });
    setNotes([data, ...notes]);
    setNoteDraft("");
  };

  const deleteNote = async (id: string) => {
    await supabase.from("lesson_notes").delete().eq("id", id);
    setNotes(notes.filter((n) => n.id !== id));
  };

  const postDiscussion = async () => {
    if (!user || !postDraft.trim()) return;
    setPosting(true);
    const { data, error } = await supabase.from("lesson_discussions").insert({
      lesson_id: lessonId, course_id: courseId, user_id: user.id, body: postDraft.trim(),
    }).select().single();
    setPosting(false);
    if (error) return toast({ title: "Could not post", description: error.message, variant: "destructive" });
    const { data: prof } = await supabase.from("profiles").select("user_id, full_name, avatar_url").eq("user_id", user.id).maybeSingle();
    setDiscussions([...discussions, { ...data, _author: prof }]);
    setPostDraft("");
  };

  return (
    <aside className="w-full lg:w-96 shrink-0 border-l border-border bg-card flex flex-col">
      <div className="flex border-b border-border">
        {([
          ["notes", StickyNote, "Notes"],
          ["resources", FileText, `Resources${resources.length ? ` (${resources.length})` : ""}`],
          ["discussion", MessageSquare, `Discussion${discussions.length ? ` (${discussions.length})` : ""}`],
        ] as [Tab, any, string][]).map(([k, Icon, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 px-3 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${tab === k ? "text-primary border-b-2 border-primary bg-primary/5" : "text-muted-foreground hover:text-foreground"}`}>
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === "notes" && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Write a private note about this lesson..." className="min-h-[80px] text-sm" />
              <Button size="sm" onClick={addNote} disabled={!noteDraft.trim()} className="w-full">Save note</Button>
            </div>
            <div className="space-y-2 pt-2">
              {notes.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No notes yet. Capture your insights here.</p>}
              {notes.map((n) => (
                <div key={n.id} className="rounded-lg border border-border bg-background/40 p-3 group">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-foreground whitespace-pre-wrap flex-1">{n.body}</p>
                    <button onClick={() => deleteNote(n.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "resources" && (
          <div className="space-y-2">
            {resources.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No additional resources for this lesson.</p>}
            {resources.map((r) => (
              <a key={r.id} href={r.url} target="_blank" rel="noreferrer"
                onClick={() => {
                  if (user) {
                    supabase.from("lesson_link_clicks").insert({
                      lesson_id: lessonId, user_id: user.id, link_type: r.kind || "resource", url: r.url,
                    }).then(() => {});
                  }
                }}
                className="flex items-center gap-2 rounded-lg border border-border bg-background/40 p-3 hover:border-primary/40 transition">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{r.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{r.url}</p>
                </div>
                <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
              </a>
            ))}
          </div>
        )}

        {tab === "discussion" && (
          <div className="space-y-3 flex flex-col h-full">
            <div className="flex-1 space-y-3">
              {discussions.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Be the first to start the conversation.</p>}
              {discussions.map((d) => (
                <div key={d.id} className="flex gap-2">
                  {d._author?.avatar_url ? (
                    <img src={d._author.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-primary/15 grid place-items-center text-[10px] font-bold text-primary shrink-0">
                      {(d._author?.full_name || "?")[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-foreground">{d._author?.full_name || "User"} <span className="text-muted-foreground font-normal">· {new Date(d.created_at).toLocaleDateString()}</span></p>
                    <p className="text-xs text-foreground whitespace-pre-wrap mt-0.5">{d.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2 pt-2 border-t border-border">
              <Textarea value={postDraft} onChange={(e) => setPostDraft(e.target.value)} placeholder="Ask a question or share a thought..." className="min-h-[60px] text-sm" />
              <Button size="sm" onClick={postDiscussion} disabled={posting || !postDraft.trim()} className="w-full">
                <Send className="h-3 w-3 mr-1" /> Post
              </Button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
