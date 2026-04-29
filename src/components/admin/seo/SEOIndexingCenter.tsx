import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, ExternalLink, Globe, FileText, AlertTriangle, Loader2, Clock, Send, RotateCcw, History } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const SEOIndexingCenter = () => {
  const [pages, setPages] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [indexingMode, setIndexingMode] = useState<string>("auto");
  const [savingMode, setSavingMode] = useState(false);

  useEffect(() => {
    loadData();
    loadIndexingMode();
  }, []);

  const loadIndexingMode = async () => {
    const { data } = await (supabase as any)
      .from("seo_settings")
      .select("value")
      .eq("key", "auto_indexing_mode")
      .maybeSingle();
    if (data?.value) setIndexingMode(String(data.value).replace(/"/g, ""));
  };

  const updateIndexingMode = async (mode: string) => {
    setSavingMode(true);
    const { error } = await (supabase as any)
      .from("seo_settings")
      .upsert({ key: "auto_indexing_mode", value: mode, updated_at: new Date().toISOString() }, { onConflict: "key" });
    setSavingMode(false);
    if (error) {
      toast({ title: "Failed to update mode", description: error.message, variant: "destructive" });
      return;
    }
    setIndexingMode(mode);
    toast({ title: "Auto-indexing mode updated", description: `Now using: ${mode}` });
  };

  const loadData = async () => {
    const [pagesRes, logsRes] = await Promise.all([
      supabase
        .from("seo_page_metadata")
        .select("id, page_url, page_type, index_status, robots_directive, last_crawled_at, crawl_errors, canonical_url, indexed_date, indexing_submitted_at, sitemap_included")
        .order("page_url"),
      supabase
        .from("indexing_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    setPages(pagesRes.data || []);
    setLogs(logsRes.data || []);
    setLoading(false);
  };

  const indexedCount = pages.filter(p => p.index_status === "indexed").length;
  const pendingCount = pages.filter(p => ["pending", "submitted"].includes(p.index_status)).length;
  const notIndexedCount = pages.filter(p => p.index_status === "not_indexed").length;
  const failedCount = pages.filter(p => p.index_status === "failed").length;
  const noindexCount = pages.filter(p => p.robots_directive?.includes("noindex")).length;
  const withErrorsCount = pages.filter(p => p.crawl_errors).length;

  const filtered = pages.filter(p => {
    if (filterStatus === "all") return true;
    return p.index_status === filterStatus;
  });

  // Real Google Indexing API submission
  const submitToGoogle = async (urls: string[], action = "URL_UPDATED") => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-indexing", {
        body: { urls, action },
      });

      if (error) throw error;

      const submitted = Number((data as any)?.submitted ?? 0);
      const total = Number((data as any)?.total ?? urls.length);
      const fallbackSubmitted = Number((data as any)?.fallback_submitted ?? 0);

      if (!(data as any)?.ok && submitted === 0) {
        throw new Error((data as any)?.error || "Failed to submit URLs for indexing.");
      }

      toast({
        title: fallbackSubmitted > 0 ? "Queued for Indexing" : "Indexing Submitted",
        description: fallbackSubmitted > 0
          ? `${submitted}/${total} URLs were queued via sitemap fallback while direct Google API access is unavailable.`
          : `${submitted}/${total} URLs submitted successfully to Google.`,
      });

      // Refresh data
      await loadData();
      return data;
    } catch (err: any) {
      toast({
        title: "Submission Failed",
        description: err.message || "Failed to submit URLs to Google Indexing API.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitIndex = async (pageId: string, url: string) => {
    await submitToGoogle([url]);
  };

  const handleBulkSubmit = async () => {
    if (selectedIds.size === 0) return;
    const urls = filtered.filter(p => selectedIds.has(p.id)).map(p => p.page_url);
    await submitToGoogle(urls);
    setSelectedIds(new Set());
  };

  const handleSubmitAllPending = async () => {
    const pendingUrls = pages
      .filter(p => ["pending", "not_indexed", "failed"].includes(p.index_status))
      .filter(p => !p.robots_directive?.includes("noindex"))
      .map(p => p.page_url);
    if (pendingUrls.length === 0) {
      toast({ title: "No pending URLs to submit" });
      return;
    }
    // Submit in batches of 100
    for (let i = 0; i < pendingUrls.length; i += 100) {
      await submitToGoogle(pendingUrls.slice(i, i + 100));
    }
  };

  const handleRequestRemoval = async (url: string) => {
    await submitToGoogle([url], "URL_DELETED");
  };

  const handleMarkIndexed = async (pageId: string) => {
    const now = new Date().toISOString();
    await supabase.from("seo_page_metadata").update({ index_status: "indexed", indexed_date: now, last_crawled_at: now }).eq("id", pageId);
    setPages(prev => prev.map(p => p.id === pageId ? { ...p, index_status: "indexed", indexed_date: now, last_crawled_at: now } : p));
    toast({ title: "Marked as Indexed" });
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };
  const toggleAll = () => {
    setSelectedIds(selectedIds.size === filtered.length ? new Set() : new Set(filtered.map(p => p.id)));
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      indexed: "bg-green-500/15 text-green-500 border-green-500/30",
      submitted: "bg-blue-500/15 text-blue-500 border-blue-500/30",
      pending: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
      failed: "bg-red-500/15 text-red-400 border-red-500/30",
      not_indexed: "bg-muted text-muted-foreground border-border",
      success: "bg-green-500/15 text-green-500 border-green-500/30",
    };
    return <Badge className={`text-xs capitalize ${variants[status] || variants.not_indexed}`}>{status.replace("_", " ")}</Badge>;
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Total Pages", value: pages.length, icon: Globe, color: "text-primary" },
          { label: "Indexed", value: indexedCount, icon: CheckCircle, color: "text-green-500" },
          { label: "Pending/Submitted", value: pendingCount, icon: Clock, color: "text-yellow-500" },
          { label: "Not Indexed", value: notIndexedCount, icon: XCircle, color: "text-red-500" },
          { label: "Failed", value: failedCount, icon: AlertTriangle, color: "text-destructive" },
        ].map(kpi => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center gap-3 pt-6">
              <kpi.icon className={`h-7 w-7 ${kpi.color}`} />
              <div>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="management" className="w-full">
        <TabsList>
          <TabsTrigger value="management" className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" /> Index Management
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" /> API Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="management" className="space-y-4">
          {/* Quick Actions */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Google Indexing API Actions</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button size="sm" onClick={handleSubmitAllPending} disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Submit All Pending to Google
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.open("https://www.aicoachportal.com/sitemap.xml", "_blank")}>
                <ExternalLink className="mr-2 h-4 w-4" /> View Sitemap
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.open("https://search.google.com/search-console", "_blank")}>
                <ExternalLink className="mr-2 h-4 w-4" /> Google Search Console
              </Button>
              <Button variant="outline" size="sm" onClick={loadData}>
                <RotateCcw className="mr-2 h-4 w-4" /> Refresh
              </Button>
            </CardContent>
          </Card>

          {/* Sitemap Info */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Sitemap Status</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Indexable pages: {pages.filter(p => !p.robots_directive?.includes("noindex")).length}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="h-4 w-4 text-muted-foreground" />
                <span>Noindex pages: {noindexCount}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-blue-500" />
                <span>API submissions today: {logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Crawl Errors */}
          {withErrorsCount > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg text-destructive">Crawl Errors ({withErrorsCount})</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Page URL</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pages.filter(p => p.crawl_errors).map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">{p.page_url}</TableCell>
                        <TableCell className="text-sm text-destructive">{p.crawl_errors}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Main Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-lg">Index Management</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="indexed">Indexed</SelectItem>
                      <SelectItem value="not_indexed">Not Indexed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedIds.size > 0 && (
                    <Button size="sm" onClick={handleBulkSubmit} disabled={submitting}>
                      {submitting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />}
                      Submit to Google ({selectedIds.size})
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                      </TableHead>
                      <TableHead>Page URL</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Indexed</TableHead>
                      <TableHead>Robots</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.slice(0, 100).map(p => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Checkbox checked={selectedIds.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                        </TableCell>
                        <TableCell className="text-sm truncate max-w-[220px]">{p.page_url}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs capitalize">{p.page_type}</Badge></TableCell>
                        <TableCell>{getStatusBadge(p.index_status)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.indexing_submitted_at ? new Date(p.indexing_submitted_at).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.indexed_date ? new Date(p.indexed_date).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-xs">{p.robots_directive}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {p.index_status !== "indexed" && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => handleSubmitIndex(p.id, p.page_url)} disabled={submitting}>
                                  <Send className="h-3 w-3 mr-1" /> Submit
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleMarkIndexed(p.id)}>
                                  <CheckCircle className="h-3 w-3 mr-1" /> Indexed
                                </Button>
                              </>
                            )}
                            {p.index_status === "indexed" && (
                              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleRequestRemoval(p.page_url)}>
                                <XCircle className="h-3 w-3 mr-1" /> Remove
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Google Indexing API Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>URL</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Retries</TableHead>
                      <TableHead>Submitted At</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No indexing submissions yet. Submit URLs above to see logs here.
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map(log => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm truncate max-w-[250px]">{log.url}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{log.action}</Badge></TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                          <TableCell className="text-sm">{log.retry_count}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(log.submitted_at).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs text-destructive truncate max-w-[200px]">
                            {log.error_message || "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SEOIndexingCenter;
