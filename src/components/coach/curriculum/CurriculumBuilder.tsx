import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, GripVertical, Trash2, Edit, ChevronDown, ChevronRight, Video, FileText, BookOpen, Zap, Users, ClipboardList, Layers } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import LessonEditor, { LessonRow } from "./LessonEditor";
import LessonMediaManager from "./LessonMediaManager";
import CoachAssignments from "./CoachAssignments";
import CoachQuizzes from "./CoachQuizzes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Module = { id: string; title: string; sort_order: number; lessons: LessonRow[] };

const TYPE_ICON: Record<string, any> = {
  video: Video, pdf: FileText, text: BookOpen, quiz: ClipboardList, assignment: ClipboardList, live: Users,
};

function SortableLesson({ lesson, onEdit, onDelete, onMedia }: { lesson: LessonRow; onEdit: () => void; onDelete: () => void; onMedia: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lesson.id! });
  const Icon = TYPE_ICON[lesson.content_type] || BookOpen;
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
    >
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground hover:text-foreground"><GripVertical className="h-4 w-4" /></button>
      <Icon className="h-4 w-4 text-primary" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{lesson.title}</p>
        <p className="text-xs text-muted-foreground capitalize">{lesson.content_type} · {lesson.duration_minutes || 0}m {lesson.drip_days ? `· Day ${lesson.drip_days}` : ""}</p>
      </div>
      {lesson.is_free_preview && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">Free</span>}
      <Button size="sm" variant="ghost" onClick={onMedia} title="Add Content (Video / YouTube / Images)"><Layers className="h-4 w-4" /></Button>
      <Button size="sm" variant="ghost" onClick={onEdit}><Edit className="h-4 w-4" /></Button>
      <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
    </div>
  );
}

function SortableModule({ mod, expanded, onToggle, onRename, onDelete, onAddLesson, onEditLesson, onDeleteLesson, onReorderLessons, onLessonMedia }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: mod.id });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="rounded-xl border border-border bg-secondary/30 p-4">
      <div className="flex items-center gap-2">
        <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground"><GripVertical className="h-4 w-4" /></button>
        <button onClick={onToggle}>{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button>
        <Input value={mod.title} onChange={(e) => onRename(e.target.value)} className="flex-1 border-none bg-transparent font-semibold focus-visible:ring-1" />
        <span className="text-xs text-muted-foreground">{mod.lessons.length} lessons</span>
        <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="h-4 w-4 text-destructive" /></Button>
      </div>
      {expanded && (
        <div className="mt-3 space-y-2 pl-6">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => onReorderLessons(mod.id, e)}>
            <SortableContext items={mod.lessons.map((l: LessonRow) => l.id!)} strategy={verticalListSortingStrategy}>
              {mod.lessons.map((l: LessonRow) => (
                <SortableLesson key={l.id} lesson={l} onEdit={() => onEditLesson(mod.id, l)} onDelete={() => onDeleteLesson(l.id!)} onMedia={() => onLessonMedia(l)} />
              ))}
            </SortableContext>
          </DndContext>
          <Button size="sm" variant="outline" onClick={() => onAddLesson(mod.id)} className="w-full">
            <Plus className="h-4 w-4 mr-1" /> Add Lesson
          </Button>
        </div>
      )}
    </div>
  );
}

const CurriculumBuilder = () => {
  const { id: courseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [activeLesson, setActiveLesson] = useState<LessonRow | null>(null);
  const [mediaLesson, setMediaLesson] = useState<LessonRow | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = async () => {
    if (!courseId) return;
    const { data: c } = await supabase.from("courses").select("*").eq("id", courseId).single();
    setCourse(c);
    const { data: mods } = await supabase.from("course_modules").select("*").eq("course_id", courseId).order("sort_order");
    const modIds = (mods || []).map((m: any) => m.id);
    const { data: lessons } = modIds.length
      ? await supabase.from("course_lessons").select("*").in("module_id", modIds).order("sort_order")
      : { data: [] };
    const grouped: Module[] = (mods || []).map((m: any) => ({
      ...m,
      lessons: (lessons || []).filter((l: any) => l.module_id === m.id),
    }));
    setModules(grouped);
    setExpanded(new Set(grouped.map((m) => m.id)));
    setLoading(false);
  };

  useEffect(() => { load(); }, [courseId]);

  const addModule = async () => {
    const { data, error } = await supabase
      .from("course_modules")
      .insert({ course_id: courseId, title: "New Module", sort_order: modules.length })
      .select()
      .single();
    if (error) return toast({ title: error.message, variant: "destructive" });
    setModules([...modules, { ...data, lessons: [] }]);
    setExpanded(new Set([...expanded, data.id]));
  };

  const renameModule = async (id: string, title: string) => {
    setModules(modules.map((m) => m.id === id ? { ...m, title } : m));
    await supabase.from("course_modules").update({ title }).eq("id", id);
  };

  const deleteModule = async (id: string) => {
    if (!confirm("Delete this module and all its lessons?")) return;
    await supabase.from("course_modules").delete().eq("id", id);
    setModules(modules.filter((m) => m.id !== id));
  };

  const handleModuleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = modules.findIndex((m) => m.id === active.id);
    const newIdx = modules.findIndex((m) => m.id === over.id);
    const reordered = arrayMove(modules, oldIdx, newIdx);
    setModules(reordered);
    await Promise.all(reordered.map((m, i) => supabase.from("course_modules").update({ sort_order: i }).eq("id", m.id)));
  };

  const handleLessonDragEnd = async (modId: string, e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const mod = modules.find((m) => m.id === modId)!;
    const oldIdx = mod.lessons.findIndex((l) => l.id === active.id);
    const newIdx = mod.lessons.findIndex((l) => l.id === over.id);
    const reordered = arrayMove(mod.lessons, oldIdx, newIdx);
    setModules(modules.map((m) => m.id === modId ? { ...m, lessons: reordered } : m));
    await Promise.all(reordered.map((l, i) => supabase.from("course_lessons").update({ sort_order: i }).eq("id", l.id!)));
  };

  const openAddLesson = (modId: string) => {
    const mod = modules.find((m) => m.id === modId)!;
    setActiveLesson({ module_id: modId, title: "", content_type: "video", sort_order: mod.lessons.length });
    setEditorOpen(true);
  };
  const openEditLesson = (_modId: string, l: LessonRow) => { setActiveLesson(l as any); setEditorOpen(true); };
  const deleteLesson = async (id: string) => {
    if (!confirm("Delete this lesson?")) return;
    await supabase.from("course_lessons").delete().eq("id", id);
    load();
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/coach/courses")}><ArrowLeft className="h-4 w-4 mr-1" /> Back to Courses</Button>
          <h2 className="text-2xl font-bold mt-2">Curriculum: {course?.title}</h2>
          <p className="text-sm text-muted-foreground">Drag to reorder. Add modules and lessons of any type.</p>
        </div>
        <Button onClick={addModule}><Plus className="h-4 w-4 mr-1" /> Add Module</Button>
      </div>

      <Tabs defaultValue="curriculum">
        <TabsList>
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
        </TabsList>

        <TabsContent value="curriculum" className="mt-4">
          {modules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
              <Zap className="h-10 w-10 mx-auto text-primary mb-3" />
              <p className="font-semibold">No modules yet</p>
              <p className="text-sm text-muted-foreground mb-4">Create your first module to start building curriculum.</p>
              <Button onClick={addModule}><Plus className="h-4 w-4 mr-1" /> Add Module</Button>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleModuleDragEnd}>
              <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {modules.map((mod) => (
                    <SortableModule
                      key={mod.id}
                      mod={mod}
                      expanded={expanded.has(mod.id)}
                      onToggle={() => {
                        const n = new Set(expanded);
                        n.has(mod.id) ? n.delete(mod.id) : n.add(mod.id);
                        setExpanded(n);
                      }}
                      onRename={(t: string) => renameModule(mod.id, t)}
                      onDelete={() => deleteModule(mod.id)}
                      onAddLesson={openAddLesson}
                      onEditLesson={openEditLesson}
                      onDeleteLesson={deleteLesson}
                      onReorderLessons={handleLessonDragEnd}
                      onLessonMedia={(l: LessonRow) => setMediaLesson(l)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          {courseId && <CoachAssignments courseId={courseId} />}
        </TabsContent>

        <TabsContent value="quizzes" className="mt-4">
          {courseId && <CoachQuizzes courseId={courseId} />}
        </TabsContent>
      </Tabs>

      {editorOpen && activeLesson && (
        <LessonEditor open={editorOpen} onOpenChange={setEditorOpen} lesson={activeLesson} onSaved={load} />
      )}
      {mediaLesson && (
        <LessonMediaManager
          open={!!mediaLesson}
          onOpenChange={(v) => !v && setMediaLesson(null)}
          lessonId={mediaLesson.id!}
          lessonTitle={mediaLesson.title}
        />
      )}
    </div>
  );
};

export default CurriculumBuilder;
