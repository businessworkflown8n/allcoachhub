import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Search, Plus, Pencil, Trash2, GripVertical, Users, UserPlus, X, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  is_system?: boolean;
  created_at: string;
  updated_at: string;
}

interface CoachLite {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

interface Assignment {
  id: string;
  coach_id: string;
  category_id: string;
  is_primary: boolean;
}

const generateSlug = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

const SortableRow = ({ cat, children }: { cat: Category; children: (handleProps: any) => React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <TableRow ref={setNodeRef} style={style} className={!cat.is_active ? "opacity-60" : ""}>
      {children({ ...attributes, ...listeners })}
    </TableRow>
  );
};

const AdminCoachCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [coachCounts, setCoachCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formIcon, setFormIcon] = useState("");
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formActive, setFormActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Coach assignment dialog
  const [coachDialogOpen, setCoachDialogOpen] = useState(false);
  const [managingCategory, setManagingCategory] = useState<Category | null>(null);
  const [allCoaches, setAllCoaches] = useState<CoachLite[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [coachSearch, setCoachSearch] = useState("");
  const [coachLoading, setCoachLoading] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("coach_categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      toast({ title: "Error loading categories", description: error.message, variant: "destructive" });
    }
    const cats = (data as Category[]) || [];
    setCategories(cats);

    // Coach counts from coach_category_permissions (multi-cat)
    const { data: perms } = await supabase
      .from("coach_category_permissions")
      .select("category_id, coach_id")
      .eq("status", "approved");

    // Also include legacy profiles.category_id as fallback
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, category_id")
      .not("category_id", "is", null);

    const pairs = new Set<string>();
    (perms || []).forEach((p: any) => pairs.add(`${p.category_id}::${p.coach_id}`));
    (profiles || []).forEach((p: any) => pairs.add(`${p.category_id}::${p.user_id}`));

    const counts: Record<string, number> = {};
    pairs.forEach((k) => {
      const [catId] = k.split("::");
      counts[catId] = (counts[catId] || 0) + 1;
    });
    setCoachCounts(counts);
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const filtered = useMemo(() => {
    if (!search) return categories;
    const q = search.toLowerCase();
    return categories.filter(c => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q));
  }, [categories, search]);

  const openCreate = () => {
    setEditing(null);
    setFormName(""); setFormSlug(""); setFormIcon("");
    setFormSortOrder(categories.length > 0 ? Math.max(...categories.map(c => c.sort_order)) + 1 : 1);
    setFormActive(true);
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setFormName(cat.name); setFormSlug(cat.slug); setFormIcon(cat.icon || "");
    setFormSortOrder(cat.sort_order); setFormActive(cat.is_active);
    setDialogOpen(true);
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editing) setFormSlug(generateSlug(val));
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    const slug = formSlug.trim() || generateSlug(formName);
    const dupName = categories.find(c => c.name.toLowerCase() === formName.trim().toLowerCase() && c.id !== editing?.id);
    const dupSlug = categories.find(c => c.slug === slug && c.id !== editing?.id);
    if (dupName) { toast({ title: "Duplicate category name", variant: "destructive" }); return; }
    if (dupSlug) { toast({ title: "Duplicate slug", variant: "destructive" }); return; }

    setSaving(true);
    const payload = { name: formName.trim(), slug, icon: formIcon.trim() || null, sort_order: formSortOrder, is_active: formActive };
    const { error } = editing
      ? await supabase.from("coach_categories").update(payload).eq("id", editing.id)
      : await supabase.from("coach_categories").insert(payload);
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: editing ? "Category updated" : "Category created" });
    setDialogOpen(false);
    fetchCategories();
  };

  const handleDelete = async (cat: Category) => {
    if (cat.is_system) { toast({ title: "System category", description: `"${cat.name}" cannot be deleted.`, variant: "destructive" }); return; }
    const count = coachCounts[cat.id] || 0;
    if (count > 0) {
      toast({ title: "Cannot delete", description: `${count} coach(es) use this category. Reassign or deactivate.`, variant: "destructive" });
      return;
    }
    if (!confirm(`Delete category "${cat.name}"?`)) return;
    const { error } = await supabase.from("coach_categories").delete().eq("id", cat.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Category deleted" });
    fetchCategories();
  };

  const toggleActive = async (cat: Category) => {
    if (cat.is_system && cat.is_active) {
      toast({ title: "System category", description: `"${cat.name}" must remain active.`, variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("coach_categories").update({ is_active: !cat.is_active }).eq("id", cat.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: cat.is_active ? "Category deactivated" : "Category activated" });
    fetchCategories();
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order);
    const oldIdx = sorted.findIndex(c => c.id === active.id);
    const newIdx = sorted.findIndex(c => c.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(sorted, oldIdx, newIdx);

    // Optimistic update
    const updated = reordered.map((c, i) => ({ ...c, sort_order: i + 1 }));
    setCategories(updated);

    // Persist
    await Promise.all(
      updated.map((c) => supabase.from("coach_categories").update({ sort_order: c.sort_order }).eq("id", c.id))
    );
    toast({ title: "Order updated" });
  };

  // === Coach assignment ===
  const openCoachManager = async (cat: Category) => {
    setManagingCategory(cat);
    setCoachDialogOpen(true);
    setCoachSearch("");
    setCoachLoading(true);

    // Fetch all coaches via user_roles -> profiles
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "coach");
    const coachIds = (roles || []).map((r: any) => r.user_id);

    let coaches: CoachLite[] = [];
    if (coachIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", coachIds);
      coaches = (profs || []) as CoachLite[];
    }
    setAllCoaches(coaches);

    const { data: perms } = await supabase
      .from("coach_category_permissions")
      .select("id, coach_id, category_id, is_primary")
      .eq("category_id", cat.id);
    setAssignments((perms || []) as Assignment[]);
    setCoachLoading(false);
  };

  const assignCoach = async (coachId: string) => {
    if (!managingCategory) return;
    const { error } = await supabase.from("coach_category_permissions").insert({
      coach_id: coachId,
      category_id: managingCategory.id,
      status: "approved",
      approved_by: (await supabase.auth.getUser()).data.user?.id,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Coach assigned" });
    openCoachManager(managingCategory);
    fetchCategories();
  };

  const unassignCoach = async (assignmentId: string) => {
    const { error } = await supabase.from("coach_category_permissions").delete().eq("id", assignmentId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Coach removed" });
    if (managingCategory) openCoachManager(managingCategory);
    fetchCategories();
  };

  const togglePrimary = async (a: Assignment) => {
    const { error } = await supabase.from("coach_category_permissions")
      .update({ is_primary: !a.is_primary }).eq("id", a.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    if (managingCategory) openCoachManager(managingCategory);
  };

  const assignedCoachIds = useMemo(() => new Set(assignments.map(a => a.coach_id)), [assignments]);
  const assignedCoaches = useMemo(
    () => assignments.map(a => ({ a, coach: allCoaches.find(c => c.user_id === a.coach_id) })).filter(x => x.coach),
    [assignments, allCoaches]
  );
  const availableCoaches = useMemo(() => {
    const q = coachSearch.toLowerCase();
    return allCoaches
      .filter(c => !assignedCoachIds.has(c.user_id))
      .filter(c => !q || (c.full_name || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q))
      .slice(0, 50);
  }, [allCoaches, assignedCoachIds, coachSearch]);

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );

  const sortedCats = [...filtered].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Coach Categories</h2>
          <p className="text-sm text-muted-foreground">
            {categories.length} categories · {categories.filter(c => c.is_active).length} active · Drag rows to reorder
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> Add Category</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search categories..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-center">Coaches</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCats.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No categories found</TableCell></TableRow>
              ) : (
                <SortableContext items={sortedCats.map(c => c.id)} strategy={verticalListSortingStrategy}>
                  {sortedCats.map((cat) => (
                    <SortableRow key={cat.id} cat={cat}>
                      {(handle) => (
                        <>
                          <TableCell>
                            <button {...handle} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground" aria-label="Drag to reorder">
                              <GripVertical className="h-4 w-4" />
                            </button>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{cat.sort_order}</TableCell>
                          <TableCell className="font-medium">
                            <span className="inline-flex items-center gap-2">
                              {cat.icon && <span>{cat.icon}</span>}
                              {cat.name}
                              {cat.is_system && <Badge variant="outline" className="text-[10px] py-0 px-1.5">System</Badge>}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground font-mono text-xs">{cat.slug}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" />{coachCounts[cat.id] || 0}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={cat.is_active ? "default" : "outline"}
                              className={cat.is_system ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}
                              onClick={() => !cat.is_system && toggleActive(cat)}
                            >
                              {cat.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-7 gap-1.5" onClick={() => openCoachManager(cat)}>
                                <UserPlus className="h-3.5 w-3.5" /> Coaches
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cat)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-destructive disabled:opacity-30"
                                onClick={() => handleDelete(cat)}
                                disabled={cat.is_system}
                                title={cat.is_system ? "System category" : "Delete"}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </SortableRow>
                  ))}
                </SortableContext>
              )}
            </TableBody>
          </Table>
        </DndContext>
      </div>

      {/* Edit / Create Category Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2"><Label>Name *</Label><Input value={formName} onChange={e => handleNameChange(e.target.value)} placeholder="e.g. Career" /></div>
            <div className="space-y-2"><Label>Slug</Label><Input value={formSlug} onChange={e => setFormSlug(e.target.value)} className="font-mono text-sm" /></div>
            <div className="space-y-2"><Label>Icon / Emoji (optional)</Label><Input value={formIcon} onChange={e => setFormIcon(e.target.value)} placeholder="e.g. 🎯" /></div>
            <div className="space-y-2"><Label>Sort Order</Label><Input type="number" value={formSortOrder} onChange={e => setFormSortOrder(Number(e.target.value))} /></div>
            <div className="flex items-center gap-3"><Switch checked={formActive} onCheckedChange={setFormActive} /><Label>Active</Label></div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving..." : editing ? "Update Category" : "Create Category"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Coaches in Category */}
      <Dialog open={coachDialogOpen} onOpenChange={setCoachDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Manage Coaches — {managingCategory?.icon} {managingCategory?.name}
            </DialogTitle>
          </DialogHeader>
          {coachLoading ? (
            <div className="space-y-2"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
          ) : (
            <div className="space-y-6 overflow-y-auto flex-1">
              {/* Assigned */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  Assigned coaches ({assignedCoaches.length})
                </h4>
                {assignedCoaches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No coaches assigned yet.</p>
                ) : (
                  <div className="space-y-2">
                    {assignedCoaches.map(({ a, coach }) => (
                      <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/50 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{coach!.full_name || "Unnamed coach"}</p>
                          <p className="text-xs text-muted-foreground truncate">{coach!.email}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8"
                            title={a.is_primary ? "Primary category" : "Mark as primary"}
                            onClick={() => togglePrimary(a)}
                          >
                            <Star className={`h-3.5 w-3.5 ${a.is_primary ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => unassignCoach(a.id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Add coach to this category</h4>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search coaches by name or email..." value={coachSearch} onChange={e => setCoachSearch(e.target.value)} className="pl-9" />
                </div>
                {availableCoaches.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    {coachSearch ? "No matching coaches." : "All coaches are already assigned."}
                  </p>
                ) : (
                  <div className="space-y-1 max-h-72 overflow-y-auto">
                    {availableCoaches.map((c) => (
                      <div key={c.user_id} className="flex items-center justify-between gap-3 rounded-lg hover:bg-muted/50 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{c.full_name || "Unnamed coach"}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                        </div>
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => assignCoach(c.user_id)}>
                          <Plus className="h-3.5 w-3.5" /> Assign
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCoachCategories;
