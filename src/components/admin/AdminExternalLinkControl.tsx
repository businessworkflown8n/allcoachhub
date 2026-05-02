import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { ExternalLink, Link2, Copy } from "lucide-react";

interface Control {
  id: string;
  feature_key: string;
  label: string;
  description: string | null;
  category: string;
  public_url: string | null;
  is_enabled: boolean;
  updated_at: string;
}

const SITE = "https://www.aicoachportal.com";

const AdminExternalLinkControl = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Control[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("external_link_controls")
      .select("*")
      .order("category")
      .order("label");
    setItems((data as Control[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const toggle = async (id: string, current: boolean, label: string) => {
    await supabase
      .from("external_link_controls")
      .update({ is_enabled: !current, updated_by: user?.id, updated_at: new Date().toISOString() })
      .eq("id", id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_enabled: !current } : i)));
    toast({ title: `${label} ${!current ? "enabled" : "disabled"}` });
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(`${SITE}${url}`);
    toast({ title: "URL copied" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link2 className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold text-foreground">External Link Control</h2>
          <p className="text-sm text-muted-foreground">
            Toggle public-facing tools on or off. Only enabled tools are accessible to users.
          </p>
        </div>
      </div>

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
                    <TableHead>Category</TableHead>
                    <TableHead>Public URL</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enable / Disable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <p className="font-medium text-foreground">{c.label}</p>
                        {c.description && <p className="text-xs text-muted-foreground mt-0.5 max-w-md">{c.description}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">{c.category.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell>
                        {c.public_url ? (
                          <div className="flex items-center gap-2">
                            <Input value={`${SITE}${c.public_url}`} readOnly className="h-8 w-64 text-xs" />
                            <Button size="icon" variant="ghost" onClick={() => copyUrl(c.public_url!)}>
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" asChild>
                              <a href={c.public_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {c.is_enabled ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Live</Badge>
                        ) : (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch checked={c.is_enabled} onCheckedChange={() => toggle(c.id, c.is_enabled, c.label)} />
                      </TableCell>
                    </TableRow>
                  ))}
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
