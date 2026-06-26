import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, PenLine, Trash2, Palette, Image as ImageIcon } from "lucide-react";

const PRESET_COLORS = [
  { name: "Royal Navy", primary: "#0B1A3A", accent: "#C9A14A" },
  { name: "Forest Green", primary: "#146C2E", accent: "#C7FF3D" },
  { name: "Crimson", primary: "#8B0E1F", accent: "#E8B95C" },
  { name: "Teal Pro", primary: "#0F766E", accent: "#F59E0B" },
  { name: "Midnight", primary: "#111827", accent: "#A855F7" },
  { name: "Slate", primary: "#334155", accent: "#0EA5E9" },
];

const CoachCertificateSignature = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sig, setSig] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("");
  const [organization, setOrganization] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0B1A3A");
  const [accentColor, setAccentColor] = useState("#C9A14A");
  const fileRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("coach_certificate_signatures").select("*").eq("coach_id", user.id).maybeSingle();
      if (data) {
        setSig(data);
        setFullName(data.full_name || "");
        setDesignation(data.designation || "");
        setOrganization(data.organization || "");
        setPrimaryColor((data as any).primary_color || "#0B1A3A");
        setAccentColor((data as any).accent_color || "#C9A14A");
      } else {
        const { data: prof } = await supabase.from("profiles").select("full_name, company_name").eq("user_id", user.id).maybeSingle();
        setFullName(prof?.full_name || "");
        setOrganization(prof?.company_name || "");
      }
      setLoading(false);
    })();
  }, [user]);

  const uploadTo = async (bucket: string, file: File, name: string) => {
    if (!user) return null;
    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) {
      toast({ title: "Please upload a PNG, JPEG, WebP or SVG", variant: "destructive" });
      return null;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Max 2MB", variant: "destructive" });
      return null;
    }
    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/${name}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });
    if (error) { toast({ title: error.message, variant: "destructive" }); return null; }
    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    return data?.signedUrl || null;
  };

  const save = async () => {
    if (!user) return;
    if (!fullName.trim()) {
      toast({ title: "Full name is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let signature_url = sig?.signature_url || null;
      let logo_url = sig?.logo_url || null;
      const sigFile = fileRef.current?.files?.[0];
      const logoFile = logoRef.current?.files?.[0];
      if (sigFile) {
        const url = await uploadTo("certificate-signatures", sigFile, "signature");
        if (url) signature_url = url;
      }
      if (logoFile) {
        const url = await uploadTo("coach-logos", logoFile, "logo");
        if (url) logo_url = url;
      }
      const payload: any = {
        coach_id: user.id,
        full_name: fullName,
        designation,
        organization,
        signature_url,
        logo_url,
        primary_color: primaryColor,
        accent_color: accentColor,
      };
      const { error } = await supabase.from("coach_certificate_signatures").upsert(payload, { onConflict: "coach_id" });
      if (error) throw error;
      toast({ title: "Certificate branding saved" });
      const { data } = await supabase.from("coach_certificate_signatures").select("*").eq("coach_id", user.id).maybeSingle();
      setSig(data);
      if (fileRef.current) fileRef.current.value = "";
      if (logoRef.current) logoRef.current.value = "";
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeAsset = async (field: "signature_url" | "logo_url") => {
    if (!user) return;
    await supabase.from("coach_certificate_signatures").update({ [field]: null } as any).eq("coach_id", user.id);
    setSig({ ...sig, [field]: null });
    toast({ title: `${field === "signature_url" ? "Signature" : "Logo"} removed` });
  };

  if (loading) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2"><PenLine className="h-5 w-5 text-primary" /></div>
        <div>
          <h3 className="text-base font-bold text-foreground">Certificate Branding</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Your name, logo, signature and colors appear on every certificate you issue.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full Name *" value={fullName} onChange={setFullName} placeholder="Dr. Amit Sharma" />
        <Field label="Designation" value={designation} onChange={setDesignation} placeholder="AI Automation Coach" />
        <Field label="Organization" value={organization} onChange={setOrganization} placeholder="ABC Academy" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Company Logo (PNG/SVG, max 2MB)</label>
          <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="mt-2 block text-sm" />
          {sig?.logo_url && (
            <div className="mt-3 inline-flex items-center gap-3 rounded-lg border border-border bg-background p-3">
              <img src={sig.logo_url} alt="logo" className="h-12 max-w-[120px] object-contain bg-white rounded" />
              <button onClick={() => removeAsset("logo_url")} className="text-xs text-destructive hover:underline inline-flex items-center gap-1">
                <Trash2 className="h-3 w-3" /> Remove
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><PenLine className="h-3 w-3" /> Signature Image (PNG/JPEG, max 2MB)</label>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="mt-2 block text-sm" />
          {sig?.signature_url && (
            <div className="mt-3 inline-flex items-center gap-3 rounded-lg border border-border bg-background p-3">
              <img src={sig.signature_url} alt="signature" className="h-16 max-w-[180px] object-contain bg-white/5 rounded" />
              <button onClick={() => removeAsset("signature_url")} className="text-xs text-destructive hover:underline inline-flex items-center gap-1">
                <Trash2 className="h-3 w-3" /> Remove
              </button>
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><Palette className="h-3 w-3" /> Certificate Colors</label>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-14 rounded border border-border bg-background" />
            <input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono" />
            <span className="text-xs text-muted-foreground">Primary</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-10 w-14 rounded border border-border bg-background" />
            <input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono" />
            <span className="text-xs text-muted-foreground">Accent</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESET_COLORS.map((p) => (
            <button key={p.name} type="button" onClick={() => { setPrimaryColor(p.primary); setAccentColor(p.accent); }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs hover:bg-accent">
              <span className="h-3 w-3 rounded-full" style={{ background: p.primary }} />
              <span className="h-3 w-3 rounded-full" style={{ background: p.accent }} />
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Save Branding
      </button>
    </div>
  );
};

const Field = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div>
    <label className="text-xs font-semibold text-muted-foreground">{label}</label>
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
  </div>
);

export default CoachCertificateSignature;
