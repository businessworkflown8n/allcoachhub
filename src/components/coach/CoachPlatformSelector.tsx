import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Search, Globe, Users, ShoppingCart, MoreHorizontal,
  CheckCircle2, RefreshCw, XCircle, Plug, Trash2
} from "lucide-react";
import PlatformConnectionWizard from "@/components/coach/PlatformConnectionWizard";

type Connection = {
  id: string;
  platform: string;
  status: string;
  last_sync_at: string | null;
  error_log: string | null;
  created_at: string;
};

const PLATFORM_CATEGORIES = [
  {
    label: "Search",
    icon: Globe,
    platforms: [
      { id: "google_ads", name: "Google Ads", desc: "Search, Display, YouTube" },
      { id: "bing_ads", name: "Bing Ads", desc: "Microsoft advertising" },
    ],
  },
  {
    label: "Social",
    icon: Users,
    platforms: [
      { id: "meta_ads", name: "Meta Ads", desc: "Facebook & Instagram" },
      { id: "tiktok_ads", name: "TikTok Ads", desc: "TikTok campaigns" },
      { id: "linkedin_ads", name: "LinkedIn Ads", desc: "B2B advertising" },
    ],
  },
  {
    label: "E-commerce",
    icon: ShoppingCart,
    platforms: [
      { id: "shopify", name: "Shopify", desc: "E-commerce store" },
      { id: "woocommerce", name: "WooCommerce", desc: "WordPress commerce" },
    ],
  },
  {
    label: "Others",
    icon: MoreHorizontal,
    platforms: [
      { id: "ga4", name: "GA4", desc: "Google Analytics 4" },
      { id: "gtm", name: "Google Tag Manager", desc: "Tag management" },
      { id: "razorpay", name: "Razorpay", desc: "Payment gateway" },
      { id: "stripe", name: "Stripe", desc: "Payment processing" },
    ],
  },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const CoachPlatformSelector = ({ open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardPlatform, setWizardPlatform] = useState({ id: "", name: "" });
  const [tab, setTab] = useState<"add" | "manage">("add");

  const fetchConnections = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("ad_platform_connections")
      .select("id, coach_id, platform, status, last_sync_at, error_log, account_id, account_name, currency, timezone, sync_frequency, token_expires_at, needs_reconnect, sync_data_scope, created_at, updated_at")
      .eq("coach_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setConnections(data as unknown as Connection[]);
  };

  useEffect(() => {
    if (open && user) fetchConnections();
  }, [open, user]);

  const handleSelect = (id: string, name: string) => {
    setWizardPlatform({ id, name });
    setWizardOpen(true);
  };

  const handleDisconnect = async (connId: string) => {
    const { error } = await supabase.from("ad_platform_connections").delete().eq("id", connId);
    if (error) { toast.error("Failed to disconnect"); return; }
    toast.success("Platform disconnected");
    fetchConnections();
  };

  const getConnection = (platformId: string) => connections.find(c => c.platform === platformId);

  const allPlatforms = PLATFORM_CATEGORIES.flatMap(c => c.platforms);
  const filtered = search
    ? allPlatforms.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5 text-primary" />
              Platform Connections
            </DialogTitle>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <Button
              size="sm"
              variant={tab === "add" ? "default" : "outline"}
              onClick={() => setTab("add")}
            >
              Add Platform
            </Button>
            <Button
              size="sm"
              variant={tab === "manage" ? "default" : "outline"}
              onClick={() => setTab("manage")}
            >
              My Connections
              {connections.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-[10px]">{connections.length}</Badge>
              )}
            </Button>
          </div>

          {tab === "add" && (
            <>
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search platforms..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Filtered results */}
              {filtered ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {filtered.map(p => {
                    const conn = getConnection(p.id);
                    return (
                      <Card key={p.id} className={conn?.status === "connected" ? "border-green-500/30" : ""}>
                        <CardContent className="p-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-foreground">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.desc}</p>
                          </div>
                          {conn?.status === "connected" ? (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">Connected</Badge>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => handleSelect(p.id, p.name)}>Connect</Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                  {filtered.length === 0 && (
                    <p className="text-sm text-muted-foreground col-span-2 text-center py-6">No platforms match your search.</p>
                  )}
                </div>
              ) : (
                /* Categorized view */
                <div className="space-y-5">
                  {PLATFORM_CATEGORIES.map(cat => {
                    const CatIcon = cat.icon;
                    return (
                      <div key={cat.label}>
                        <p className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                          <CatIcon className="h-4 w-4 text-primary" /> {cat.label}
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {cat.platforms.map(p => {
                            const conn = getConnection(p.id);
                            return (
                              <Card key={p.id} className={`cursor-pointer transition-colors hover:border-primary/40 ${conn?.status === "connected" ? "border-green-500/30" : ""}`}>
                                <CardContent className="p-3 flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{p.name}</p>
                                    <p className="text-xs text-muted-foreground">{p.desc}</p>
                                  </div>
                                  {conn?.status === "connected" ? (
                                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">Connected</Badge>
                                  ) : (
                                    <Button size="sm" variant="outline" onClick={() => handleSelect(p.id, p.name)}>Connect</Button>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {tab === "manage" && (
            <div className="space-y-3">
              {connections.length === 0 ? (
                <div className="text-center py-10">
                  <Plug className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No platforms connected yet.</p>
                  <Button size="sm" variant="outline" className="mt-3" onClick={() => setTab("add")}>Add Platform</Button>
                </div>
              ) : (
                connections.map(conn => {
                  const pInfo = allPlatforms.find(p => p.id === conn.platform);
                  return (
                    <Card key={conn.id} className={conn.status === "connected" ? "border-green-500/30" : conn.status === "error" ? "border-destructive/30" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {conn.status === "connected" ? (
                              <CheckCircle2 className="h-5 w-5 text-green-400" />
                            ) : conn.status === "error" ? (
                              <XCircle className="h-5 w-5 text-destructive" />
                            ) : (
                              <Plug className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div>
                              <p className="font-medium text-foreground text-sm">{pInfo?.name || conn.platform}</p>
                              <p className="text-xs text-muted-foreground">{pInfo?.desc}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={
                                conn.status === "connected"
                                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                                  : conn.status === "error"
                                  ? "bg-destructive/20 text-destructive border-destructive/30"
                                  : ""
                              }
                              variant={conn.status === "connected" || conn.status === "error" ? "outline" : "secondary"}
                            >
                              {conn.status}
                            </Badge>
                            <Button size="sm" variant="ghost" onClick={() => handleSelect(conn.platform, pInfo?.name || conn.platform)}>
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDisconnect(conn.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        {conn.last_sync_at && (
                          <p className="text-[10px] text-muted-foreground mt-2">Last sync: {format(new Date(conn.last_sync_at), "dd MMM yyyy HH:mm")}</p>
                        )}
                        {conn.error_log && (
                          <p className="text-[10px] text-destructive mt-1 truncate">{conn.error_log}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PlatformConnectionWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        platformId={wizardPlatform.id}
        platformName={wizardPlatform.name}
        onConnected={() => {
          fetchConnections();
          onOpenChange(false);
        }}
      />
    </>
  );
};

export default CoachPlatformSelector;
