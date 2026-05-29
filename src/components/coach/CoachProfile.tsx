import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCoachFeatures } from "@/hooks/useCoachFeatures";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Camera, Upload, Trash2, Loader2 } from "lucide-react";

const CoachProfile = () => {
  const { user } = useAuth();
  const { profile_picture_access, loading: featuresLoading } = useCoachFeatures();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      setProfile(data);
      setLoading(false);
    });
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Invalid format", description: "Please use JPG, JPEG, PNG or WEBP.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image too large", description: "Please upload an image under 5MB.", variant: "destructive" });
      return;
    }

    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/profile-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("coach-profile-images")
      .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
    if (uploadError) {
      setUploadingAvatar(false);
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      return;
    }
    const { data: pub } = supabase.storage.from("coach-profile-images").getPublicUrl(path);
    const url = pub.publicUrl;
    const { error: dbError } = await supabase.from("profiles").update({
      coach_profile_image_url: url,
      profile_image_status: "pending",
      profile_image_uploaded_at: new Date().toISOString(),
      profile_image_reject_reason: null,
    } as any).eq("user_id", user.id);
    setUploadingAvatar(false);
    if (dbError) {
      toast({ title: "Save failed", description: dbError.message, variant: "destructive" });
      return;
    }
    setProfile({ ...profile, coach_profile_image_url: url, profile_image_status: "pending" });
    toast({ title: "Submitted for approval", description: "Admin will review your new profile picture shortly." });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAvatar = async () => {
    if (!user) return;
    setUploadingAvatar(true);
    const { error } = await supabase.from("profiles").update({
      avatar_url: null,
      coach_profile_image_url: null,
      profile_image_status: "approved",
      profile_image_uploaded_at: null,
    } as any).eq("user_id", user.id);
    setUploadingAvatar(false);
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
      return;
    }
    setProfile({ ...profile, avatar_url: null, coach_profile_image_url: null, profile_image_status: "approved" });
    toast({ title: "Profile picture removed" });
  };

  const handleSave = async () => {
    if (!user || !profile) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: profile.full_name,
      bio: profile.bio,
      category: profile.category,
      experience: profile.experience,
      certifications: profile.certifications,
      social_links: profile.social_links,
      intro_video_url: profile.intro_video_url,
      contact_number: profile.contact_number,
      country: profile.country,
      city: profile.city,
      linkedin_profile: profile.linkedin_profile,
    }).eq("user_id", user.id);
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Profile updated" });
  };

  if (loading) return <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mt-8" />;

  const initials = (profile?.full_name || "C").split(" ").map((s: string) => s[0]).slice(0, 2).join("").toUpperCase();
  const canUploadAvatar = !featuresLoading && profile_picture_access;

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-xl font-bold text-foreground">Coach Profile</h2>

      {/* Profile Picture */}
      <div className="flex items-center gap-5 rounded-xl border border-border bg-card p-5">
        <div className="relative">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Profile" className="h-20 w-20 rounded-full object-cover border-2 border-border" />
          ) : (
            <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center text-xl font-semibold text-foreground border-2 border-border">
              {initials}
            </div>
          )}
          {canUploadAvatar && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1.5 text-primary-foreground shadow-lg hover:brightness-110 disabled:opacity-50"
              aria-label="Change profile picture"
            >
              {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-foreground">Profile Picture</p>
          {canUploadAvatar ? (
            <>
              <p className="text-xs text-muted-foreground">Square JPG/PNG, under 200KB. Shown on your public coach page.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" /> {profile?.avatar_url ? "Change" : "Upload"}
                </button>
                {profile?.avatar_url && (
                  <button
                    type="button"
                    onClick={removeAvatar}
                    disabled={uploadingAvatar}
                    className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Profile picture uploads are currently disabled by the admin.</p>
          )}
        </div>
      </div>

      {profile?.slug && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3">
          <span className="text-sm text-muted-foreground">Your landing page:</span>
          <code className="rounded bg-background px-2 py-0.5 text-sm">{window.location.origin}/coach-profile/{profile.slug}</code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/coach-profile/${profile.slug}`);
              toast({ title: "Link copied!" });
            }}
            className="rounded-md border border-input bg-background px-2 py-1 text-xs hover:bg-accent"
          >
            Copy
          </button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-foreground">Full Name</Label>
          <Input value={profile?.full_name || ""} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} className="bg-secondary border-border" />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Category</Label>
          <Input value={profile?.category || ""} onChange={(e) => setProfile({ ...profile, category: e.target.value })} className="bg-secondary border-border" placeholder="e.g. AI, Marketing" />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Experience</Label>
          <Input value={profile?.experience || ""} onChange={(e) => setProfile({ ...profile, experience: e.target.value })} className="bg-secondary border-border" placeholder="e.g. 10+ years in AI" />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Contact Number</Label>
          <Input value={profile?.contact_number || ""} onChange={(e) => setProfile({ ...profile, contact_number: e.target.value })} className="bg-secondary border-border" />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">Country</Label>
          <Input value={profile?.country || ""} onChange={(e) => setProfile({ ...profile, country: e.target.value })} className="bg-secondary border-border" />
        </div>
        <div className="space-y-2">
          <Label className="text-foreground">City</Label>
          <Input value={profile?.city || ""} onChange={(e) => setProfile({ ...profile, city: e.target.value })} className="bg-secondary border-border" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label className="text-foreground">LinkedIn</Label>
          <Input value={profile?.linkedin_profile || ""} onChange={(e) => setProfile({ ...profile, linkedin_profile: e.target.value })} className="bg-secondary border-border" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label className="text-foreground">Intro Video URL</Label>
          <Input value={profile?.intro_video_url || ""} onChange={(e) => setProfile({ ...profile, intro_video_url: e.target.value })} className="bg-secondary border-border" placeholder="https://youtube.com/..." />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-foreground">Bio</Label>
        <Textarea value={profile?.bio || ""} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} className="bg-secondary border-border" rows={4} />
      </div>
      <button onClick={handleSave} disabled={saving} className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110 disabled:opacity-50">
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
};

export default CoachProfile;
