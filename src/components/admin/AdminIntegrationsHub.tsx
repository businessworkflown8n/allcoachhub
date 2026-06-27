import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Plug, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Globe, ShoppingCart, CreditCard, BarChart3, Shield, Eye, Power
} from "lucide-react";
import AdminIntegrationWizard from "./AdminIntegrationWizard";
import AdminIntegrationGuide from "./AdminIntegrationGuide";

type Connection = {
  id: string;
  coach_id: string;
  platform: string;
  status: string;
  last_sync_at: string | null;
  error_log: string | null;
  created_at: string;
  account_id: string | null;
  account_name: string | null;
  needs_reconnect: boolean | null;
  token_expires_at: string | null;
};

type PlatformConfig = {
  id: string;
  platform_id: string;
  platform_name: string;
  category: string;
  is_enabled: boolean;
};

type CoachAccess = {
  id: string;
  coach_id: string;
  platform_id: string;
  is_enabled: boolean;
};

const INTEGRATIONS = [
  { category: "Advertising", icon: Globe, items: [
    { id: "google_ads", name: "Google Ads", description: "Search, Display, YouTube campaigns" },
    { id: "meta_ads", name: "Meta Ads", description: "Facebook & Instagram advertising" },
    { id: "tiktok_ads", name: "TikTok Ads", description: "TikTok campaign management" },
    { id: "linkedin_ads", name: "LinkedIn Ads", description: "B2B advertising platform" },
    { id: "bing_ads", name: "Bing Ads", description: "Microsoft advertising network" },
  ]},
  { category: "E-commerce", icon: ShoppingCart, items: [
    { id: "shopify", name: "Shopify", description: "E-commerce store integration" },
    { id: "woocommerce", name: "WooCommerce", description: "WordPress commerce plugin" },
    { id: "custom_backend", name: "Custom Backend", description: "Your own backend API" },
  ]},
  { category: "Analytics", icon: BarChart3, items: [
    { id: "ga4", name: "GA4", description: "Google Analytics 4 tracking" },
    { id: "gtm", name: "Google Tag Manager", description: "Tag management system" },
    { id: "meta_capi", name: "Meta Conversion API", description: "Server-side tracking" },
  ]},
  { category: "Payments", icon: CreditCard, items: [
    { id: "razorpay", name: "Razorpay", description: "Indian payment gateway" },
    { id: "stripe", name: "Stripe", description: "Global payment processing" },
    { id: "paypal", name: "PayPal", description: "Online payment system" },
  ]},
];

type Coach = { id: string; user_id: string; full_name: string | null };

const AdminIntegrationsHub = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardPlatform, setWizardPlatform] = useState({ id: "", name: "" });
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [selectedCoachId, setSelectedCoachId] = useState<string>("all");
  const [platformConfigs, setPlatformConfigs] = useState<PlatformConfig[]>([]);
  const [coachAccessList, setCoachAccessList] = useState<CoachAccess[]>([]);
  const [accessCoachFilter, setAccessCoachFilter] = useState<string>("");

  const fetchConnections = async () => {
    let query = supabase.from("ad_platform_connections").select("id, coach_id, platform, status, last_sync_at, error_log, account_id, account_name, currency, timezone, sync_frequency, token_expires_at, needs_reconnect, sync_data_scope, created_at, updated_at").order("created_at", { ascending: false });
    if (selectedCoachId !== "all") query = query.eq("coach_id", selectedCoachId);
    const { data } = await query;
    if (data) setConnections(data as unknown as Connection[]);
    setLoading(false);
  };

  const fetchCoaches = async () => {
    const { data } = await supabase.from("profiles").select("id, user_id, full_name");
    if (data) setCoaches(data as Coach[]);
  };

  const fetchPlatformConfigs = async () => {
    const { data } = await supabase.from("platform_integrations_config").select("*").order("platform_name");
    if (data) setPlatformConfigs(data as unknown as PlatformConfig[]);
  };

  const fetchCoachAccess = async () => {
    const { data } = await supabase.from("coach_platform_access").select("*");
    if (data) setCoachAccessList(data as unknown as CoachAccess[]);
  };

  useEffect(() => { fetchConnections(); fetchCoaches(); fetchPlatformConfigs(); fetchCoachAccess(); }, []);
  useEffect(() => { fetchConnections(); }, [selectedCoachId]);

  const getConnectionStatus = (platformId: string) => connections.find(c => c.platform === platformId);

  const getStatusBadge = (conn: Connection | undefined) => {
    if (!conn) return <Badge variant="outline" className="text-muted-foreground">Not Connected</Badge>;
    if (conn.needs_reconnect) return <Badge variant="destructive">Reconnect Required</Badge>;
    if (conn.status === "connected") return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Connected</Badge>;
    if (conn.status === "error") return <Badge variant="destructive">Error</Badge>;
    return <Badge variant="secondary">{conn.status}</Badge>;
  };

  const getStatusIcon = (conn: Connection | undefined) => {
    if (!conn) return <Plug className="h-5 w-5 text-muted-foreground" />;
    if (conn.needs_reconnect) return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
    if (conn.status === "connected") return <CheckCircle2 className="h-5 w-5 text-green-400" />;
    if (conn.status === "error") return <XCircle className="h-5 w-5 text-destructive" />;
    return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
  };

  const handleConnect = (platformId: string, platformName: string) => {
    setWizardPlatform({ id: platformId, name: platformName });
    setWizardOpen(true);
  };

  const handleDisconnect = async (connId: string) => {
    const { error } = await supabase.from("ad_platform_connections").delete().eq("id", connId);
    if (error) { toast.error("Failed to disconnect"); return; }
    toast.success("Disconnected");
    fetchConnections();
  };

  const togglePlatform = async (platformId: string, enabled: boolean) => {
    const { error } = await supabase.from("platform_integrations_config")
      .update({ is_enabled: enabled })
      .eq("platform_id", platformId);
    if (error) { toast.error("Failed to update"); return; }
    toast.success(`Platform ${enabled ? "enabled" : "disabled"}`);
    fetchPlatformConfigs();
  };

  const toggleCoachAccess = async (coachId: string, platformId: string, enabled: boolean) => {
    if (enabled) {
      const { error } = await supabase.from("coach_platform_access").upsert({
        coach_id: coachId,
        platform_id: platformId,
        is_enabled: true,
      }, { onConflict: "coach_id,platform_id" });
      if (error) { toast.error("Failed to grant access"); return; }
    } else {
      const { error } = await supabase.from("coach_platform_access")
        .update({ is_enabled: false })
        .eq("coach_id", coachId)
        .eq("platform_id", platformId);
      if (error) { toast.error("Failed to revoke access"); return; }
    }
    toast.success("Access updated");
    fetchCoachAccess();
  };

  const isCoachPlatformEnabled = (coachId: string, platformId: string) => {
    return coachAccessList.some(a => a.coach_id === coachId && a.platform_id === platformId && a.is_enabled);
  };

  const connectedCount = connections.filter(c => c.status === "connected").length;
  const errorCount = connections.filter(c => c.status === "error" || c.needs_reconnect).length;

  if (loading) return <div className="flex justify-center p-8"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2"><Plug className="h-6 w-6 text-primary" /> Integrations Hub</h2>
        <p className="text-muted-foreground text-sm mt-1">Connect ad platforms, analytics, and payment gateways</p>
      </div>

      <Tabs defaultValue="connections">
        <TabsList>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="platform-control" className="gap-1"><Shield className="h-3 w-3" /> Platform Control</TabsTrigger>
          <TabsTrigger value="all-connections" className="gap-1"><Eye className="h-3 w-3" /> All Connections</TabsTrigger>
          <TabsTrigger value="guide">Setup Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-6 mt-4">
          {/* Coach Selector */}
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Connect on behalf of Coach</label>
              <Select value={selectedCoachId} onValueChange={setSelectedCoachId}>
                <SelectTrigger className="w-[240px]"><SelectValue placeholder="All coaches" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Coaches</SelectItem>
                  {coaches.filter(c => c.full_name).map(c => (
                    <SelectItem key={c.user_id} value={c.user_id}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedCoachId !== "all" && (
              <Badge variant="secondary" className="h-8 flex items-center gap-1">
                Acting as: {coaches.find(c => c.user_id === selectedCoachId)?.full_name || "Coach"}
              </Badge>
            )}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-primary">{connectedCount}</p><p className="text-xs text-muted-foreground">Connected</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-destructive">{errorCount}</p><p className="text-xs text-muted-foreground">Errors</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-muted-foreground">{INTEGRATIONS.reduce((t, c) => t + c.items.length, 0) - connectedCount}</p><p className="text-xs text-muted-foreground">Available</p></CardContent></Card>
          </div>

          {/* Integration Categories */}
          {INTEGRATIONS.map(category => {
            const CatIcon = category.icon;
            return (
              <div key={category.category} className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <CatIcon className="h-5 w-5 text-primary" /> {category.category}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {category.items.map(item => {
                    const conn = getConnectionStatus(item.id);
                    const platformEnabled = platformConfigs.find(p => p.platform_id === item.id)?.is_enabled !== false;
                    return (
                      <Card key={item.id} className={`${conn?.status === "connected" ? "border-green-500/30" : ""} ${!platformEnabled ? "opacity-50" : ""}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(conn)}
                              <div>
                                <p className="font-medium text-foreground">{item.name}</p>
                                <p className="text-xs text-muted-foreground">{item.description}</p>
                              </div>
                            </div>
                            {!platformEnabled && <Badge variant="outline" className="text-xs">Disabled</Badge>}
                          </div>
                          <div className="flex items-center justify-between">
                            {getStatusBadge(conn)}
                            <div className="flex gap-1">
                              {conn?.status === "connected" ? (
                                <>
                                  <Button size="sm" variant="ghost"><RefreshCw className="h-3 w-3 mr-1" /> Sync</Button>
                                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDisconnect(conn.id)}>Disconnect</Button>
                                </>
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => handleConnect(item.id, item.name)} disabled={!platformEnabled}>Connect</Button>
                              )}
                            </div>
                          </div>
                          {conn?.account_name && (
                            <p className="text-[10px] text-muted-foreground mt-2">Account: {conn.account_name}</p>
                          )}
                          {conn?.last_sync_at && (
                            <p className="text-[10px] text-muted-foreground mt-1">Last sync: {format(new Date(conn.last_sync_at), "dd MMM yyyy HH:mm")}</p>
                          )}
                          {conn?.error_log && (
                            <p className="text-[10px] text-destructive mt-1 truncate">{conn.error_log}</p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* Platform Control Tab */}
        <TabsContent value="platform-control" className="space-y-6 mt-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Power className="h-5 w-5 text-primary" /> Global Platform Toggles
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Enable or disable platforms for the entire platform</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {platformConfigs.map(pc => (
              <Card key={pc.platform_id} className={pc.is_enabled ? "border-green-500/20" : "border-muted"}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground text-sm">{pc.platform_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{pc.category}</p>
                  </div>
                  <Switch
                    checked={pc.is_enabled}
                    onCheckedChange={(checked) => togglePlatform(pc.platform_id, checked)}
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="pt-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-3">
              <Shield className="h-5 w-5 text-primary" /> Coach-Level Access Control
            </h3>
            <p className="text-xs text-muted-foreground mb-4">Control which coaches can see and use specific platforms</p>

            <div className="mb-4">
              <Select value={accessCoachFilter} onValueChange={setAccessCoachFilter}>
                <SelectTrigger className="w-[260px]"><SelectValue placeholder="Select a coach to manage access" /></SelectTrigger>
                <SelectContent>
                  {coaches.filter(c => c.full_name).map(c => (
                    <SelectItem key={c.user_id} value={c.user_id}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {accessCoachFilter && (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {platformConfigs.filter(p => p.is_enabled).map(pc => (
                  <Card key={pc.platform_id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{pc.platform_name}</p>
                      </div>
                      <Switch
                        checked={isCoachPlatformEnabled(accessCoachFilter, pc.platform_id)}
                        onCheckedChange={(checked) => toggleCoachAccess(accessCoachFilter, pc.platform_id, checked)}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* All Connections Tab */}
        <TabsContent value="all-connections" className="mt-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">All Coach Connections</h3>
            <p className="text-xs text-muted-foreground">Monitor and manage all platform connections across coaches</p>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Coach</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Sync</TableHead>
                      <TableHead>Token Expiry</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {connections.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No connections found</TableCell>
                      </TableRow>
                    ) : (
                      connections.map(conn => {
                        const coach = coaches.find(c => c.user_id === conn.coach_id);
                        const platformName = INTEGRATIONS.flatMap(c => c.items).find(i => i.id === conn.platform)?.name || conn.platform;
                        const tokenExpired = conn.token_expires_at && new Date(conn.token_expires_at) < new Date();
                        return (
                          <TableRow key={conn.id}>
                            <TableCell className="text-sm">{coach?.full_name || conn.coach_id.slice(0, 8)}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{platformName}</Badge></TableCell>
                            <TableCell className="text-xs text-muted-foreground">{conn.account_name || conn.account_id || "—"}</TableCell>
                            <TableCell>{getStatusBadge(conn)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {conn.last_sync_at ? format(new Date(conn.last_sync_at), "dd MMM HH:mm") : "Never"}
                            </TableCell>
                            <TableCell>
                              {conn.token_expires_at ? (
                                <Badge variant={tokenExpired ? "destructive" : "outline"} className="text-[10px]">
                                  {tokenExpired ? "Expired" : format(new Date(conn.token_expires_at), "dd MMM")}
                                </Badge>
                              ) : "—"}
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="ghost" className="text-destructive text-xs" onClick={() => handleDisconnect(conn.id)}>
                                Force Disconnect
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guide" className="mt-4">
          <AdminIntegrationGuide />
        </TabsContent>
      </Tabs>

      {/* Connection Wizard */}
      <AdminIntegrationWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        platformId={wizardPlatform.id}
        platformName={wizardPlatform.name}
        onConnected={fetchConnections}
        coachId={selectedCoachId !== "all" ? selectedCoachId : undefined}
      />
    </div>
  );
};

export default AdminIntegrationsHub;
