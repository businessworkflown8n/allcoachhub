import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { ExternalLink, Link2, Copy, Globe, Lock, BarChart3 } from "lucide-react";

type AccessMode = "public" | "private";

interface Control {
  id: string;
  feature_key: string;
  label: string;
  description: string | null;
  category: string;
  public_url: string | null;
  url_template: string | null;
  is_enabled: boolean;
  access_mode: AccessMode;
  expires_at: string | null;
  updated_at: string;
}

const SITE = "https://www.aicoachportal.com";

const AdminExternalLinkControl = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Control[]>([]);
  const [loading, setLoading] = useState(true);
  const [clickCounts, setClickCounts] = useState<Record<string, { total: number; pub: number; priv: number }>>({});
  const [coachSlugs, setCoachSlugs] = useState<string[]>([]);
  const [previewSlug, setPreviewSlug] = useState<string>("");

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: rows }, { data: clicks }, { data: coaches }] = await Promise.all([
      supabase.from("external_link_controls").select("*").order("category").order("label"),
      supabase.from("external_link_clicks").select("feature_key, access_mode"),
      supabase.from("profiles").select("slug").not("slug", "is", null).limit(20),
    ]);
    setItems((rows as Control[]) || []);
    const counts: Record<string, { total: number; pub: number; priv: number }> = {};
    (clicks || []).forEach((c: any) => {
      const k = c.feature_key;
      if (!counts[k]) counts[k] = { total: 0, pub: 0, priv: 0 };
      counts[k].total += 1;
      if (c.access_mode === "private") counts[k].priv += 1; else counts[k].pub += 1;
    });
    setClickCounts(counts);
    const slugs = ((coaches as any[]) || []).map((c) => c.slug).filter(Boolean);
    setCoachSlugs(slugs);
    if (slugs[0]) setPreviewSlug(slugs[0]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const update = async (id: string, patch: Partial<Control>, message: string) => {
    await supabase
      .from("external_link_controls")
      .update({ ...patch, updated_by: user?.id, updated_at: new Date().toISOString() })
      .eq("id", id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    toast({ title: message });
  };

  const buildUrl = (c: Control) => {
    if (c.url_template) {
      // Replace any {placeholder} with previewSlug
      return `${SITE}${c.url_template.replace(/\{[^}]+\}/g, previewSlug || "{coachSlug}")}`;
    }
    return c.public_url ? `${SITE}${c.public_url}` : "";
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "URL copied" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link2 className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">External Link Control</h2>
          <p className="text-sm text-muted-foreground">
            Toggle public-facing tools, choose Public/Private access, and share live coach-specific links.
          </p>
        </div>
      </div>

      {coachSlugs.length > 0 && (
        <Card>
          <CardContent className="pt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Label className="text-sm">Preview links for coach slug:</Label>
            <select
              value={previewSlug}
              onChange={(e) => setPreviewSlug(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {coachSlugs.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="text-xs text-muted-foreground">Used to render `{`{coachSlug}`}` in URL templates below.</span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Public Tools &amp; Generators</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No external link controls configured.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature</TableHead>
                    <TableHead>Live URL</TableHead>
                    <TableHead>Access Mode</TableHead>
                    <TableHead>Enable</TableHead>
                    <TableHead>Tracking</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((c) => {
                    const url = buildUrl(c);
                    const stats = clickCounts[c.feature_key] || { total: 0, pub: 0, priv: 0 };
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="align-top">
                          <p className="font-medium text-foreground">{c.label}</p>
                          {c.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 max-w-md">{c.description}</p>
                          )}
                          <Badge variant="secondary" className="capitalize mt-2">
                            {c.category.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-top">
                          {url ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Input value={url} readOnly className="h-8 w-72 text-xs" />
                                <Button size="icon" variant="ghost" onClick={() => copyUrl(url)}>
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" asChild>
                                  <a href={url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                </Button>
                              </div>
                              {c.url_template && (
                                <p className="text-[10px] text-muted-foreground font-mono">
                                  {c.url_template}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="align-top min-w-[180px]">
                          <RadioGroup
                            value={c.access_mode}
                            onValueChange={(v) =>
                              update(c.id, { access_mode: v as AccessMode }, `Set to ${v} access`)
                            }
                            className="space-y-1"
                          >
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <RadioGroupItem value="public" id={`${c.id}-pub`} />
                              <Globe className="h-3.5 w-3.5 text-emerald-500" />
                              Public
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <RadioGroupItem value="private" id={`${c.id}-priv`} />
                              <Lock className="h-3.5 w-3.5 text-amber-500" />
                              Private (login)
                            </label>
                          </RadioGroup>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-col gap-1">
                            <Switch
                              checked={c.is_enabled}
                              onCheckedChange={() =>
                                update(
                                  c.id,
                                  { is_enabled: !c.is_enabled },
                                  `${c.label} ${!c.is_enabled ? "enabled" : "disabled"}`
                                )
                              }
                            />
                            {c.is_enabled ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 w-fit">
                                Live
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="w-fit">Off</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex items-center gap-2 text-xs">
                            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                            <div>
                              <p className="font-semibold text-foreground">{stats.total} clicks</p>
                              <p className="text-muted-foreground">
                                {stats.pub} pub · {stats.priv} priv
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminExternalLinkControl;
