import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Settings, Loader2, ShieldOff, Save } from "lucide-react";

const FLAGS: Array<[string, string, string]> = [
  ["certificates_enabled", "Certificates Enabled", "Master switch — disables certificate issuance platform-wide."],
  ["signature_upload_enabled", "Coach Signature Upload", "Allow coaches to upload custom signatures."],
  ["qr_verification_enabled", "QR Verification", "Embed QR code linking to public verification page on PDFs."],
  ["revocation_enabled", "Certificate Revocation", "Allow coaches and admins to revoke certificates."],
  ["workshop_certificates_enabled", "Workshop Certificates", "Issue certificates for completed workshops."],
  ["ai_kids_certificates_enabled", "AI Kids Pro Certificates", "Issue certificates for AI Kids Pro enrollments."],
  ["course_wise_templates_enabled", "Per-Course Templates", "Allow coaches to assign different templates to specific courses."],
];

const AdminCertificateSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [revoked, setRevoked] = useState<any[]>([]);

  const load = async () => {
    const [s, t, r] = await Promise.all([
      supabase.from("certificate_settings").select("*").limit(1).maybeSingle(),
      supabase.from("certificate_templates").select("*").order("created_at", { ascending: false }),
      supabase.from("issued_certificates").select("id, certificate_number, learner_name, course_name, revoked_at, revoked_reason, coach_name").eq("status", "revoked").order("revoked_at", { ascending: false }).limit(20),
    ]);
    setSettings(s.data);
    setTemplates(t.data || []);
    setRevoked(r.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    const { id, created_at, updated_at, singleton, ...patch } = settings;
    const { error } = await supabase.from("certificate_settings").update(patch).eq("id", id);
    setSaving(false);
    if (error) toast({ title: error.message, variant: "destructive" });
    else toast({ title: "Settings saved" });
  };

  const setDefault = async (tid: string, kind: string) => {
    await supabase.from("certificate_templates").update({ is_default: false }).eq("template_kind", kind);
    await supabase.from("certificate_templates").update({ is_default: true }).eq("id", tid);
    toast({ title: "Default template updated" });
    load();
  };

  if (loading) return <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mt-8" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">Certificate Settings</h2>
          <p className="text-sm text-muted-foreground">Configure how certificates work across the platform.</p>
        </div>
      </div>

      {/* Toggles */}
      <section className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-sm font-bold text-foreground">Features</h3>
        <div className="space-y-3">
          {FLAGS.map(([key, label, desc]) => (
            <label key={key} className="flex items-start justify-between gap-4 cursor-pointer">
              <div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <input
                type="checkbox"
                checked={!!settings?.[key]}
                onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })}
                className="h-5 w-5 accent-primary"
              />
            </label>
          ))}
        </div>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        </button>
      </section>

      {/* Templates */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-bold text-foreground mb-3">Templates</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <div key={t.id} className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-primary font-bold">{t.tier}</span>
                {t.is_default && <span className="text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded-full font-bold">DEFAULT</span>}
              </div>
              <p className="mt-2 text-sm font-semibold text-foreground">{t.title}</p>
              <p className="text-xs text-muted-foreground">{t.template_kind}</p>
              {!t.is_default && (
                <button onClick={() => setDefault(t.id, t.template_kind)} className="mt-3 text-xs text-primary hover:underline">
                  Set as default for {t.template_kind}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Revoked log */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><ShieldOff className="h-4 w-4 text-destructive" /> Recently Revoked</h3>
        {revoked.length === 0 ? (
          <p className="text-sm text-muted-foreground">No revoked certificates.</p>
        ) : (
          <div className="space-y-2">
            {revoked.map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-semibold text-foreground">{r.learner_name} — {r.course_name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{r.certificate_number} · by {r.coach_name}</p>
                  {r.revoked_reason && <p className="text-xs text-destructive mt-0.5">{r.revoked_reason}</p>}
                </div>
                <span className="text-xs text-muted-foreground">{r.revoked_at ? new Date(r.revoked_at).toLocaleDateString() : ""}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminCertificateSettings;
