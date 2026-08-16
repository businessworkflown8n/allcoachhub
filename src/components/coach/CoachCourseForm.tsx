import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Upload, X, ImageIcon, AlertTriangle } from "lucide-react";
import { useCoachCategoryPermissions } from "@/hooks/useCoachCategoryPermissions";
import { useCoachCategories } from "@/hooks/useCoachCategories";
import { useThumbnailAccess } from "@/hooks/useThumbnailAccess";
import { useCoachFeatures } from "@/hooks/useCoachFeatures";
import CategoryRequestModal from "@/components/coach/CategoryRequestModal";
import { CertificateTemplatePicker } from "@/components/coach/templates/CertificateTemplatePicker";

const AIThumbnailGenerator = lazy(() => import("@/components/coach/AIThumbnailGenerator"));
const CoachCourseForm = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isEdit = !!id;
  const [saving, setSaving] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [thumbnailRequestNote, setThumbnailRequestNote] = useState("");
  const [showThumbRequest, setShowThumbRequest] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { approvedCategories, requests, loading: permLoading, refetch: refetchPerms } = useCoachCategoryPermissions(user?.id);
  const { categories: allCategories } = useCoachCategories(true);
  const { hasAccess: hasThumbnailAccess } = useThumbnailAccess();
  const { kids_courses_access } = useCoachFeatures();
  const canCreateKidsCourses = !!kids_courses_access;

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    course_type: "regular" as "regular" | "ai_kids_pro",
    level: "Beginner",
    language: "English",
    duration_hours: "",
    price_usd: "",
    price_inr: "",
    original_price_usd: "",
    original_price_inr: "",
    discount_percent: "",
  });
  const [certificateTemplateId, setCertificateTemplateId] = useState<string | null>(null);

  // Set default category to primary approved category
  useEffect(() => {
    if (!isEdit && approvedCategories.length > 0 && !form.category) {
      const primary = approvedCategories.find((c) => c.is_primary);
      setForm((prev) => ({ ...prev, category: primary?.category_name || approvedCategories[0].category_name }));
    }
  }, [approvedCategories, isEdit]);

  useEffect(() => {
    if (isEdit && user) {
      supabase.from("courses").select("*").eq("id", id).eq("coach_id", user.id).single().then(({ data }) => {
        if (data) {
          setForm({
            title: data.title,
            description: data.description || "",
            category: data.category,
            course_type: ((data as any).course_type === "ai_kids_pro" ? "ai_kids_pro" : "regular") as "regular" | "ai_kids_pro",
            level: data.level,
            language: data.language,
            duration_hours: String(data.duration_hours),
            price_usd: String(data.price_usd),
            price_inr: String(data.price_inr),
            original_price_usd: data.original_price_usd ? String(data.original_price_usd) : "",
            original_price_inr: data.original_price_inr ? String(data.original_price_inr) : "",
            discount_percent: data.discount_percent ? String(data.discount_percent) : "",
          });
          if (data.thumbnail_url) setThumbnailPreview(data.thumbnail_url);
          setCertificateTemplateId(((data as any).certificate_template_id as string) ?? null);
        }
      });
    }
  }, [id, user, isEdit]);

  const updateField = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  // Check if selected category is approved
  const isSelectedCategoryApproved = approvedCategories.some((c) => c.category_name === form.category);
  const selectedCategoryObj = allCategories.find((c) => c.name === form.category);
  const hasPendingRequest = selectedCategoryObj
    ? requests.some((r) => r.requested_category_id === selectedCategoryObj.id && r.status === "pending")
    : false;

  // Categories not yet approved and not pending
  const pendingCategoryIds = new Set(requests.filter((r) => r.status === "pending").map((r) => r.requested_category_id));
  const approvedCategoryIds = new Set(approvedCategories.map((c) => c.category_id));
  const requestableCategories = allCategories.filter(
    (c) => !approvedCategoryIds.has(c.id) && !pendingCategoryIds.has(c.id)
  );

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be under 5MB", variant: "destructive" });
      return;
    }
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAIThumbnailSelect = async (dataUrl: string) => {
    // Convert base64 data URL to File
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], `ai-thumbnail-${Date.now()}.png`, { type: "image/png" });
    setThumbnailFile(file);
    setThumbnailPreview(dataUrl);
  };

  const uploadThumbnail = async (courseId: string): Promise<string | null> => {
    if (!thumbnailFile || !user) return null;
    const ext = thumbnailFile.name.split(".").pop();
    const path = `${user.id}/${courseId}.${ext}`;
    const { error } = await supabase.storage.from("course-thumbnails").upload(path, thumbnailFile, { upsert: true });
    if (error) {
      console.error("Thumbnail upload error:", error);
      toast({ title: "Thumbnail upload failed", description: error.message, variant: "destructive" });
      return null;
    }
    const { data: urlData } = supabase.storage.from("course-thumbnails").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleRequestThumbnail = async () => {
    if (!user || !isEdit || !id) {
      toast({ title: "Save the course first, then request a thumbnail", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("courses").update({
      rejection_reason: `THUMBNAIL_REQUEST: ${thumbnailRequestNote || "Please add a thumbnail for this course."}`
    }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Thumbnail request sent to admin" });
    setShowThumbRequest(false);
    setThumbnailRequestNote("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!form.category) {
      toast({ title: "Category is required", variant: "destructive" });
      return;
    }

    const isApproved = approvedCategories.some((c) => c.category_name === form.category);

    setSaving(true);

    // If category is NOT approved, save as draft with pending category approval
    let categoryRequestId: string | null = null;
    if (!isApproved && !isEdit) {
      // Find the category ID
      const catObj = allCategories.find((c) => c.name === form.category);
      if (!catObj) {
        toast({ title: "Invalid category selected", variant: "destructive" });
        setSaving(false);
        return;
      }

      // Check if there's already a pending request for this category
      const existingPending = requests.find(
        (r) => r.requested_category_id === catObj.id && r.status === "pending"
      );

      if (existingPending) {
        categoryRequestId = existingPending.id;
      } else {
        // Auto-create a category request
        const { data: reqData, error: reqError } = await supabase
          .from("coach_category_requests")
          .insert({
            coach_id: user.id,
            requested_category_id: catObj.id,
            reason: `Auto-requested while creating course: "${form.title}"`,
            status: "pending",
          })
          .select("id")
          .single();

        if (reqError) {
          if (reqError.message.includes("duplicate") || reqError.code === "23505") {
            // Already exists, fetch it
            const { data: existing } = await supabase
              .from("coach_category_requests")
              .select("id")
              .eq("coach_id", user.id)
              .eq("requested_category_id", catObj.id)
              .eq("status", "pending")
              .single();
            categoryRequestId = existing?.id || null;
          } else {
            toast({ title: "Error creating category request", description: reqError.message, variant: "destructive" });
            setSaving(false);
            return;
          }
        } else {
          categoryRequestId = reqData?.id || null;
        }
      }
    }

    const payload: any = {
      coach_id: user.id,
      title: form.title,
      description: form.description,
      category: form.category,
      level: form.level,
      language: form.language,
      duration_hours: Number(form.duration_hours) || 0,
      price_usd: Number(form.price_usd) || 0,
      price_inr: Number(form.price_inr) || 0,
      original_price_usd: form.original_price_usd ? Number(form.original_price_usd) : null,
      original_price_inr: form.original_price_inr ? Number(form.original_price_inr) : null,
      discount_percent: form.discount_percent ? Number(form.discount_percent) : 0,
      course_type: canCreateKidsCourses && form.course_type === "ai_kids_pro" ? "ai_kids_pro" : "regular",
      certificate_template_id: certificateTemplateId,
    };

    // If unapproved category, force draft and tag
    if (!isApproved && !isEdit) {
      payload.is_published = false;
      payload.requires_category_approval = true;
      payload.category_request_id = categoryRequestId;
      payload.approval_status = "pending";
    }

    let error;
    let courseId = id;
    if (isEdit) {
      ({ error } = await supabase.from("courses").update(payload).eq("id", id));
    } else {
      const res = await supabase.from("courses").insert(payload).select("id").single();
      error = res.error;
      courseId = res.data?.id;
    }

    if (error) {
      setSaving(false);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    // Upload thumbnail if selected
    if (thumbnailFile && courseId) {
      setUploadingThumb(true);
      const thumbUrl = await uploadThumbnail(courseId);
      if (thumbUrl) {
        await supabase.from("courses").update({ thumbnail_url: thumbUrl, thumbnail_status: "pending" } as any).eq("id", courseId);
      }
      setUploadingThumb(false);
    } else if (!thumbnailFile && !thumbnailPreview && courseId) {
      // No thumbnail provided → fire-and-forget AI auto-generation
      supabase.functions
        .invoke("auto-generate-course-thumbnail", { body: { courseId } })
        .catch((err) => console.warn("auto-thumbnail failed", err));
    }

    setSaving(false);

    if (!isApproved && !isEdit) {
      toast({
        title: "Course saved as draft",
        description: "This category requires admin approval. Your course will be saved as a draft until approved.",
      });
    } else {
      toast({ title: isEdit ? "Course updated" : "Course created" });
    }

    navigate("/coach/courses");
  };

  if (permLoading) return <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mt-8" />;

  return (
    <div className="max-w-2xl space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <h2 className="text-xl font-bold text-foreground">{isEdit ? "Edit Course" : "Create New Course"}</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Course Type Selector */}
        <div className="space-y-2 rounded-xl border border-border bg-card/40 p-4">
          <Label className="text-foreground">Create Course For *</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => updateField("course_type", "regular")}
              className={`rounded-lg border p-3 text-left text-sm transition-all ${
                form.course_type === "regular"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-secondary text-muted-foreground hover:border-primary/40"
              }`}
            >
              <div className="font-semibold">🎓 Regular Course</div>
              <div className="text-xs opacity-80">Standard adult / professional learners</div>
            </button>
            <button
              type="button"
              disabled={!canCreateKidsCourses}
              onClick={() => canCreateKidsCourses && updateField("course_type", "ai_kids_pro")}
              className={`rounded-lg border p-3 text-left text-sm transition-all ${
                !canCreateKidsCourses
                  ? "cursor-not-allowed border-border bg-secondary/40 text-muted-foreground/60"
                  : form.course_type === "ai_kids_pro"
                  ? "border-primary bg-gradient-to-br from-green-500/15 to-blue-500/15 text-foreground"
                  : "border-border bg-secondary text-muted-foreground hover:border-primary/40"
              }`}
              title={canCreateKidsCourses ? "" : "Requires admin approval"}
            >
              <div className="font-semibold">🚀 AI Kids Pro (Class 5–12)</div>
              <div className="text-xs opacity-80">
                {canCreateKidsCourses
                  ? "Shown only in AI Kids Pro section"
                  : "Locked — request access from admin"}
              </div>
            </button>
          </div>
          {form.course_type === "ai_kids_pro" && (
            <p className="text-xs text-primary">
              This course will appear exclusively under /courses/ai-kids-pro and not in the regular courses listing.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Course Title *</Label>
          <Input value={form.title} onChange={(e) => updateField("title", e.target.value)} required className="bg-secondary border-border" />
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Description</Label>
          <Textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} className="bg-secondary border-border" rows={4} />
        </div>

        {/* Thumbnail Upload */}
        <div className="space-y-2">
          <Label className="text-foreground">Thumbnail Image (Optional)</Label>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleThumbnailSelect} className="hidden" />
          {thumbnailPreview ? (
            <div className="relative w-full max-w-xs">
              <img src={thumbnailPreview} alt="Thumbnail preview" className="w-full h-40 object-cover rounded-lg border border-border" />
              <button type="button" onClick={removeThumbnail} className="absolute top-2 right-2 rounded-full bg-card/80 p-1 hover:bg-destructive/20">
                <X className="h-4 w-4 text-foreground" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-secondary px-4 py-8 w-full max-w-xs hover:border-primary/50 transition-colors"
            >
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Click to upload thumbnail</span>
            </button>
          )}
          <p className="text-xs text-muted-foreground">Max 5MB. Recommended: 1280×720px (16:9)</p>
          {isEdit && (
            <div className="pt-1">
              <button type="button" onClick={() => setShowThumbRequest(!showThumbRequest)} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <ImageIcon className="h-3 w-3" /> Request admin to add/update thumbnail
              </button>
              {showThumbRequest && (
                <div className="mt-2 space-y-2 rounded-lg border border-border bg-card p-3">
                  <Textarea
                    value={thumbnailRequestNote}
                    onChange={(e) => setThumbnailRequestNote(e.target.value)}
                    placeholder="Describe what kind of thumbnail you'd like..."
                    className="bg-secondary border-border text-sm"
                    rows={2}
                  />
                  <button type="button" onClick={handleRequestThumbnail} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:brightness-110">
                    Send Request
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* AI Thumbnail Generator - only visible if coach has access */}
        {hasThumbnailAccess && (
          <Suspense fallback={<div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto" />}>
            <AIThumbnailGenerator courseTitle={form.title} onSelect={handleAIThumbnailSelect} />
          </Suspense>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-foreground">Category *</Label>
            <Select value={form.category} onValueChange={(v) => updateField("category", v)}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                {/* Show approved categories first */}
                {approvedCategories.map((cat) => (
                  <SelectItem key={cat.category_id} value={cat.category_name}>
                    {cat.category_icon ? `${cat.category_icon} ` : ""}{cat.category_name}
                    {cat.is_primary ? " (Primary)" : ""}
                  </SelectItem>
                ))}
                {/* Show all other active categories as selectable but marked */}
                {allCategories
                  .filter((c) => !approvedCategoryIds.has(c.id))
                  .map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.icon ? `${cat.icon} ` : ""}{cat.name} — Requires Approval
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            {/* Warning when unapproved category selected */}
            {form.category && !isSelectedCategoryApproved && (
              <div className="flex items-start gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
                <AlertTriangle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                <div className="text-xs text-yellow-300">
                  <p className="font-semibold">This category requires admin approval.</p>
                  <p className="mt-0.5 text-yellow-400/80">
                    Your course will be saved as a draft and a category approval request will be automatically submitted. You can publish the course once the category is approved.
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setRequestModalOpen(true)}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <Plus className="h-3 w-3" /> Want to teach in another category? Request approval
            </button>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Level</Label>
            <Select value={form.level} onValueChange={(v) => updateField("level", v)}>
              <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Language</Label>
            <Input value={form.language} onChange={(e) => updateField("language", e.target.value)} className="bg-secondary border-border" />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Duration (hours) *</Label>
            <Input type="number" value={form.duration_hours} onChange={(e) => updateField("duration_hours", e.target.value)} required className="bg-secondary border-border" />
          </div>
        </div>

        <h3 className="text-sm font-semibold text-foreground pt-2">Pricing</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-foreground">Price (USD) *</Label>
            <Input type="number" value={form.price_usd} onChange={(e) => updateField("price_usd", e.target.value)} required className="bg-secondary border-border" />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Price (INR) *</Label>
            <Input type="number" value={form.price_inr} onChange={(e) => updateField("price_inr", e.target.value)} required className="bg-secondary border-border" />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Original Price (USD)</Label>
            <Input type="number" value={form.original_price_usd} onChange={(e) => updateField("original_price_usd", e.target.value)} className="bg-secondary border-border" />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Original Price (INR)</Label>
            <Input type="number" value={form.original_price_inr} onChange={(e) => updateField("original_price_inr", e.target.value)} className="bg-secondary border-border" />
          </div>
          <div className="space-y-2">
            <Label className="text-foreground">Discount %</Label>
            <Input type="number" value={form.discount_percent} onChange={(e) => updateField("discount_percent", e.target.value)} className="bg-secondary border-border" />
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-border">
          <Label className="text-foreground">🎓 Certificate Template</Label>
          <p className="text-xs text-muted-foreground">Choose the design issued to learners who complete this course. Leave blank to use the platform default.</p>
          <CertificateTemplatePicker
            value={certificateTemplateId}
            onChange={(id) => setCertificateTemplateId(id)}
            sourceType="course"
          />
        </div>

        <button type="submit" disabled={saving || uploadingThumb} className="glow-lime rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-50">
          {uploadingThumb ? "Uploading thumbnail..." : saving ? "Saving..." : !isSelectedCategoryApproved && form.category && !isEdit ? "Save as Draft (Pending Approval)" : isEdit ? "Update Course" : "Create Course"}
        </button>
      </form>

      {/* Pending requests info */}
      {requests.filter((r) => r.status === "pending").length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">Pending Category Requests</h4>
          <div className="space-y-1">
            {requests.filter((r) => r.status === "pending").map((r) => (
              <p key={r.id} className="text-xs text-muted-foreground">
                {r.category_icon} {r.category_name} — <span className="text-yellow-400">Pending</span>
              </p>
            ))}
          </div>
        </div>
      )}

      <CategoryRequestModal
        open={requestModalOpen}
        onOpenChange={setRequestModalOpen}
        coachId={user?.id || ""}
        availableCategories={requestableCategories}
        onSuccess={refetchPerms}
      />
    </div>
  );
};

export default CoachCourseForm;
