import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, Link2, Globe, BarChart3 } from "lucide-react";
import { LINK_TYPE_LABELS, type CurriculumLinkType } from "@/hooks/useCurriculumSettings";

const ALL_LINK_TYPES: CurriculumLinkType[] = ["youtube", "vimeo", "google_drive", "zoom", "loom", "website", "other"];

const AdminCurriculumControl = () => {
  const { user } = useAuth();
  const [row, setRow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [domainInput, setDomainInput] = useState("");
  const [clickStats, setClickStats] = useState<{ total: number; byType: Record<string, number> }>({ total: 0, byType: {} });

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: settings }, { data: clicks }] = await Promise.all([
      supabase.from("curriculum_link_settings" as any).select("*").limit(1).maybeSingle(),
      supabase.from("lesson_link_clicks" as any).select("link_type"),
    ]);
    setRow(settings);
    const byType: Record<string, number> = {};
    (clicks as any[] || []).forEach((c) => { byType[c.link_type || "other"] = (byType[c.link_type || "other"] || 0) + 1; });
    setClickStats({ total: (clicks as any[] || []).length, byType });
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const update = (patch: any) => setRow((r: any) => ({ ...r, ...patch }));

  const save = async () => {
    if (!row) return;
    setSaving(true);
    const { error } = await supabase
      .from("curriculum_link_settings" as any)
      .update({
        allowed_link_types: row.allowed_link_types,
        domain_whitelist: row.domain_whitelist,
        max_links_per_lesson: row.max_links_per_lesson,
        allow_preview: row.allow_preview,
        allow_downloadable: row.allow_downloadable,
        allow_embed: row.allow_embed,
        allow_open_new_tab: row.allow_open_new_tab,
        require_admin_approval: row.require_admin_approval,
        uploads_disabled: row.uploads_disabled,
        updated_by: user?.id,
      })
      .eq("id", row.id);
    setSaving(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Curriculum settings updated" });
  };

  const toggleType = (t: CurriculumLinkType) => {
    const cur: string[] = row.allowed_link_types || [];
    update({ allowed_link_types: cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t] });
  };

  const addDomain = () => {
    const d = domainInput.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!d) return;
    const cur: string[] = row.domain_whitelist || [];
    if (cur.includes(d)) return;
    update({ domain_whitelist: [...cur, d] });
    setDomainInput("");
  };
  const removeDomain = (d: string) => update({ domain_whitelist: (row.domain_whitelist || []).filter((x: string) => x !== d) });

  if (loading || !row) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">Curriculum Permissions &amp; Link Control</h2>
          <p className="text-sm text-muted-foreground">
            Coaches can only add external links to lessons. Configure which link types and domains are accepted across the platform.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Link2 className="h-4 w-4" /> Allowed Link Types</CardTitle>
          <CardDescription>Disable a type to prevent coaches from saving lessons that link to it.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ALL_LINK_TYPES.map((t) => (
            <label key={t} className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer">
              <div>
                <p className="font-medium text-foreground">{LINK_TYPE_LABELS[t]}</p>
                <p className="text-xs text-muted-foreground">{clickStats.byType[t] || 0} clicks tracked</p>
              </div>
              <Switch checked={(row.allowed_link_types || []).includes(t)} onCheckedChange={() => toggleType(t)} />
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Globe className="h-4 w-4" /> Domain Whitelist</CardTitle>
          <CardDescription>If non-empty, lessons may only link to URLs whose hostname matches one of these domains.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(row.domain_whitelist || []).length === 0 && <span className="text-xs text-muted-foreground">No whitelist — all approved link types accepted.</span>}
            {(row.domain_whitelist || []).map((d: string) => (
              <Badge key={d} variant="secondary" className="cursor-pointer" onClick={() => removeDomain(d)}>
                {d} ✕
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="e.g. youtube.com"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDomain())}
            />
            <Button variant="outline" onClick={addDomain}>Add</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Global Feature Toggles</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Toggle label="Disable all uploads" hint="Coaches cannot upload videos, PDFs, or files." checked={!!row.uploads_disabled} onChange={(v) => update({ uploads_disabled: v })} />
          <Toggle label="Allow embedded preview" hint="Show inline player for supported URLs." checked={!!row.allow_embed} onChange={(v) => update({ allow_embed: v })} />
          <Toggle label="Allow Free Preview" hint="Coaches can mark lessons as free preview." checked={!!row.allow_preview} onChange={(v) => update({ allow_preview: v })} />
          <Toggle label="Allow downloadable resources" hint="Permit downloadable resource links per lesson." checked={!!row.allow_downloadable} onChange={(v) => update({ allow_downloadable: v })} />
          <Toggle label="Allow Open in New Tab" hint="Permit coaches to force links into a new tab." checked={!!row.allow_open_new_tab} onChange={(v) => update({ allow_open_new_tab: v })} />
          <Toggle label="Require admin approval" hint="New curriculum content must be approved before going live." checked={!!row.require_admin_approval} onChange={(v) => update({ require_admin_approval: v })} />
          <div className="rounded-lg border border-border p-3">
            <Label className="text-sm">Max links per lesson</Label>
            <Input
              type="number" min={1} max={50}
              value={row.max_links_per_lesson || 10}
              onChange={(e) => update({ max_links_per_lesson: parseInt(e.target.value) || 1 })}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Curriculum Click Analytics</CardTitle>
          <CardDescription>Total external link clicks across all lessons.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-foreground">{clickStats.total}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {Object.entries(clickStats.byType).map(([k, v]) => (
              <Badge key={k} variant="outline">{LINK_TYPE_LABELS[k as CurriculumLinkType] || k}: {v}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Save Curriculum Settings
        </Button>
      </div>
    </div>
  );
};

const Toggle = ({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <label className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer">
    <div>
      <p className="font-medium text-foreground text-sm">{label}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </label>
);

export default AdminCurriculumControl;
