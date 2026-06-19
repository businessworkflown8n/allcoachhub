import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2, Upload, PenLine, Trash2 } from "lucide-react";

const CoachCertificateSignature = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sig, setSig] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("");
  const [organization, setOrganization] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("coach_certificate_signatures").select("*").eq("coach_id", user.id).maybeSingle();
      if (data) {
        setSig(data);
        setFullName(data.full_name || "");
        setDesignation(data.designation || "");
        setOrganization(data.organization || "");
      } else {
        const { data: prof } = await supabase.from("profiles").select("full_name, company_name").eq("user_id", user.id).maybeSingle();
        setFullName(prof?.full_name || "");
        setOrganization(prof?.company_name || "");
      }
      setLoading(false);
    })();
  }, [user]);

  const upload = async (file: File) => {
    if (!user) return null;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      toast({ title: "Please upload a PNG or JPEG", variant: "destructive" });
      return null;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Max 2MB", variant: "destructive" });
      return null;
    }
    const ext = file.name.split(".").pop() || "png";
    const path = `${user.id}/signature.${ext}`;
    const { error } = await supabase.storage.from("certificate-signatures").upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      toast({ title: error.message, variant: "destructive" });
      return null;
    }
    const { data } = await supabase.storage.from("certificate-signatures").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
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
      const file = fileRef.current?.files?.[0];
      if (file) {
        const url = await upload(file);
        if (url) signature_url = url;
      }
      const payload = { coach_id: user.id, full_name: fullName, designation, organization, signature_url };
      const { error } = await supabase.from("coach_certificate_signatures").upsert(payload, { onConflict: "coach_id" });
      if (error) throw error;
      toast({ title: "Certificate signature saved" });
      const { data } = await supabase.from("coach_certificate_signatures").select("*").eq("coach_id", user.id).maybeSingle();
      setSig(data);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeSig = async () => {
    if (!user) return;
    await supabase.from("coach_certificate_signatures").update({ signature_url: null }).eq("coach_id", user.id);
    setSig({ ...sig, signature_url: null });
    toast({ title: "Signature image removed" });
  };

  if (loading) return <Loader2 className="h-6 w-6 animate-spin text-primary" />;

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2"><PenLine className="h-5 w-5 text-primary" /></div>
        <div>
          <h3 className="text-base font-bold text-foreground">Certificate Signature</h3>
          <p className="text-xs text-muted-foreground mt-0.5">This appears on every certificate you issue.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full Name *" value={fullName} onChange={setFullName} placeholder="Dr. Amit Sharma" />
        <Field label="Designation" value={designation} onChange={setDesignation} placeholder="AI Automation Coach" />
        <Field label="Organization" value={organization} onChange={setOrganization} placeholder="ABC Academy" />
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground">Signature Image (PNG/JPEG, max 2MB)</label>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="mt-2 block text-sm" />
        {sig?.signature_url && (
          <div className="mt-3 inline-flex items-center gap-3 rounded-lg border border-border bg-background p-3">
            <img src={sig.signature_url} alt="signature" className="h-16 max-w-[180px] object-contain bg-white/5 rounded" />
            <button onClick={removeSig} className="text-xs text-destructive hover:underline inline-flex items-center gap-1">
              <Trash2 className="h-3 w-3" /> Remove
            </button>
          </div>
        )}
      </div>

      <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Save Signature
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
