import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Plus, Trash2, ArrowUp, ArrowDown, Search, Eye, EyeOff, Layers, TrendingUp } from "lucide-react";

type Cat = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  icon: string | null;
  thumbnail_url: string | null;
  banner_url: string | null;
  is_visible: boolean;
  sort_order: number;
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const empty: Partial<Cat> = {
  name: "", slug: "", tagline: "", description: "", icon: "",
  thumbnail_url: "", banner_url: "", is_visible: true, sort_order: 0,
};

const AdminCourseCategories = () => {
  const { toast } = useToast();
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "hidden">("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<Cat> | null>(null);
  const [toDelete, setToDelete] = useState<Cat | null>(null);
  const [saving, setSaving] = useState(false);
  const [counts, setCounts] = useState<Record<string, { courses: number; enrollments: number }>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("course_categories" as any)
      .select("*")
      .order("sort_order", { ascending: true });
    const list = ((data as any) || []) as Cat[];
    setCats(list);

    // counts per category (by name match against courses.category text)
    const names = list.map(c => c.name);
    if (names.length) {
      const { data: courses } = await supabase
        .from("courses")
        .select("id, category")
        .in("category", names);
      const courseIds: string[] = (courses || []).map((c: any) => c.id);
      const courseToCat: Record<string, string> = {};
      (courses || []).forEach((c: any) => { courseToCat[c.id] = c.category; });

      let enrolls: any[] = [];
      if (courseIds.length) {
        const { data: e } = await supabase
          .from("enrollments")
          .select("course_id")
          .in("course_id", courseIds);
        enrolls = e || [];
      }
      const map: Record<string, { courses: number; enrollments: number }> = {};
      names.forEach(n => { map[n] = { courses: 0, enrollments: 0 }; });
      (courses || []).forEach((c: any) => { map[c.category].courses += 1; });
      enrolls.forEach((e: any) => {
        const cat = courseToCat[e.course_id];
        if (cat && map[cat]) map[cat].enrollments += 1;
      });
      setCounts(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return cats.filter(c => {
      if (filter === "active" && !c.is_visible) return false;
      if (filter === "hidden" && c.is_visible) return false;
      if (search && !`${c.name} ${c.slug} ${c.tagline ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [cats, filter, search]);

  const totals = useMemo(() => {
    const totalCourses = Object.values(counts).reduce((a, b) => a + b.courses, 0);
    const totalEnrolls = Object.values(counts).reduce((a, b) => a + b.enrollments, 0);
    const popular = Object.entries(counts).sort((a, b) => b[1].enrollments - a[1].enrollments)[0];
    return {
      total: cats.length,
      active: cats.filter(c => c.is_visible).length,
      hidden: cats.filter(c => !c.is_visible).length,
      totalCourses,
      totalEnrolls,
      popular: popular?.[0] || "—",
    };
  }, [cats, counts]);

  const toggleVisible = async (c: Cat) => {
    const next = !c.is_visible;
    setCats(prev => prev.map(x => x.id === c.id ? { ...x, is_visible: next } : x));
    const { error } = await supabase
      .from("course_categories" as any)
      .update({ is_visible: next })
      .eq("id", c.id);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      load();
    } else {
      toast({ title: next ? "Category visible" : "Category hidden" });
    }
  };

  const move = async (c: Cat, dir: -1 | 1) => {
    const sorted = [...cats].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex(x => x.id === c.id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from("course_categories" as any).update({ sort_order: swap.sort_order }).eq("id", c.id),
      supabase.from("course_categories" as any).update({ sort_order: c.sort_order }).eq("id", swap.id),
    ]);
    load();
  };

  const save = async () => {
    if (!editing?.name) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: any = {
      name: editing.name,
      slug: editing.slug || slugify(editing.name),
      tagline: editing.tagline || null,
      description: editing.description || null,
      icon: editing.icon || null,
      thumbnail_url: editing.thumbnail_url || null,
      banner_url: editing.banner_url || null,
      is_visible: editing.is_visible ?? true,
      sort_order: editing.sort_order ?? (cats.length + 1),
    };
    const res = editing.id
      ? await supabase.from("course_categories" as any).update(payload).eq("id", editing.id)
      : await supabase.from("course_categories" as any).insert(payload);
    setSaving(false);
    if (res.error) {
      toast({ title: "Save failed", description: res.error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing.id ? "Category updated" : "Category created" });
    setEditing(null);
    load();
  };

  const remove = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("course_categories" as any).delete().eq("id", toDelete.id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else toast({ title: "Category deleted" });
    setToDelete(null);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Course Categories</h2>
          <p className="text-sm text-muted-foreground">Manage course categories visible across the website.</p>
        </div>
        <Button onClick={() => setEditing({ ...empty })}>
          <Plus className="mr-2 h-4 w-4" /> New Category
        </Button>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Total", value: totals.total, icon: <Layers className="h-4 w-4" /> },
          { label: "Active", value: totals.active, icon: <Eye className="h-4 w-4 text-emerald-500" /> },
          { label: "Hidden", value: totals.hidden, icon: <EyeOff className="h-4 w-4 text-red-500" /> },
          { label: "Courses", value: totals.totalCourses, icon: <Layers className="h-4 w-4" /> },
          { label: "Enrollments", value: totals.totalEnrolls, icon: <TrendingUp className="h-4 w-4" /> },
          { label: "Most Popular", value: totals.popular, icon: <TrendingUp className="h-4 w-4 text-primary" /> },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">{s.icon}{s.label}</div>
              <div className="mt-1 truncate text-lg font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={filter} onValueChange={(v: any) => setFilter(v)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="hidden">Hidden</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative ml-auto w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search categories…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Categories</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted-foreground">No categories found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Order</th>
                    <th className="px-4 py-2">Category</th>
                    <th className="px-4 py-2">Courses</th>
                    <th className="px-4 py-2">Enrollments</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const ct = counts[c.name] || { courses: 0, enrollments: 0 };
                    return (
                      <tr key={c.id} className="border-t border-border hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(c, -1)}><ArrowUp className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(c, 1)}><ArrowDown className="h-4 w-4" /></Button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="text-xl">{c.icon || "📦"}</div>
                            <div>
                              <div className="font-medium text-foreground">{c.name}</div>
                              {c.tagline && <div className="text-xs text-muted-foreground line-clamp-1">{c.tagline}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{ct.courses}</td>
                        <td className="px-4 py-3">{ct.enrollments}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Switch checked={c.is_visible} onCheckedChange={() => toggleVisible(c)} />
                            <Badge variant="secondary" className={c.is_visible ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500"}>
                              {c.is_visible ? "Active" : "Hidden"}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="ghost" onClick={() => setEditing(c)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setToDelete(c)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit / Create Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Name *</Label>
                <Input
                  value={editing.name ?? ""}
                  onChange={e => setEditing(s => ({ ...s!, name: e.target.value, slug: s?.slug || slugify(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={editing.slug ?? ""} onChange={e => setEditing(s => ({ ...s!, slug: slugify(e.target.value) }))} />
              </div>
              <div>
                <Label>Icon (emoji)</Label>
                <Input value={editing.icon ?? ""} onChange={e => setEditing(s => ({ ...s!, icon: e.target.value }))} placeholder="🚀" />
              </div>
              <div className="md:col-span-2">
                <Label>Tagline</Label>
                <Input value={editing.tagline ?? ""} onChange={e => setEditing(s => ({ ...s!, tagline: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <Textarea rows={3} value={editing.description ?? ""} onChange={e => setEditing(s => ({ ...s!, description: e.target.value }))} />
              </div>
              <div>
                <Label>Thumbnail URL</Label>
                <Input value={editing.thumbnail_url ?? ""} onChange={e => setEditing(s => ({ ...s!, thumbnail_url: e.target.value }))} />
              </div>
              <div>
                <Label>Banner URL</Label>
                <Input value={editing.banner_url ?? ""} onChange={e => setEditing(s => ({ ...s!, banner_url: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3 md:col-span-2">
                <div>
                  <Label className="font-medium">Visible Across Website</Label>
                  <p className="text-xs text-muted-foreground">When OFF, hidden from homepage, courses page, navigation & search.</p>
                </div>
                <Switch checked={editing.is_visible ?? true} onCheckedChange={(v) => setEditing(s => ({ ...s!, is_visible: v }))} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{toDelete?.name}". Existing courses and enrollments are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCourseCategories;
