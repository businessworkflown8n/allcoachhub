import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useContactAccess } from "@/hooks/useContactAccess";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Lock, Clock, Send, Users, Download } from "lucide-react";
import { maskName } from "@/lib/learnerPrivacy";

interface Lead {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  created_at: string;
  user_type: string;
}

const CoachWebsiteLeads = () => {
  const { user } = useAuth();
  const { hasAccess, isPending, requestAccess, loading: accessLoading } = useContactAccess();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [purpose, setPurpose] = useState("follow_up");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("chatbot_leads")
      .select("id, name, email, whatsapp, created_at, user_type")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setLeads(data || []);
        setLoading(false);
      });
  }, [user]);

  const getStatus = useCallback(
    (leadId: string) => {
      if (hasAccess(leadId)) return "approved";
      if (isPending(leadId)) return "requested";
      return "hidden";
    },
    [hasAccess, isPending]
  );

  const statusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1"><ShieldCheck className="h-3 w-3" /> Approved</Badge>;
      case "requested":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 gap-1"><Clock className="h-3 w-3" /> Requested</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground border-border gap-1"><Lock className="h-3 w-3" /> Contact Hidden</Badge>;
    }
  };

  const hiddenLeads = leads.filter((l) => getStatus(l.id) === "hidden");
  const selectableIds = new Set(hiddenLeads.map((l) => l.id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === selectableIds.size) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableIds));
    }
  };

  const openBulkRequestModal = () => {
    if (selectedIds.size === 0) {
      toast({ title: "No leads selected", description: "Select leads with hidden contacts first.", variant: "destructive" });
      return;
    }
    setPurpose("follow_up");
    setModalOpen(true);
  };

  const handleBulkSubmit = async () => {
    setSubmitting(true);
    let successCount = 0;
    for (const id of selectedIds) {
      const lead = leads.find((l) => l.id === id);
      const result = await requestAccess(id, lead?.user_type || "learner");
      if (!result?.error) successCount++;
    }
    toast({ title: `${successCount} request(s) sent`, description: "Admin will review your contact access requests." });
    setSelectedIds(new Set());
    setModalOpen(false);
    setSubmitting(false);
  };

  const downloadCSV = () => {
    const approvedLeads = leads.filter((l) => getStatus(l.id) === "approved");
    if (approvedLeads.length === 0) {
      toast({ title: "No approved leads", description: "CSV download is available only for approved contacts.", variant: "destructive" });
      return;
    }
    const header = "Name,Email,WhatsApp,Registered Date\n";
    const rows = approvedLeads.map((l) =>
      `"${l.name}","${l.email}","${l.whatsapp}","${new Date(l.created_at).toLocaleDateString()}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `approved-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading || accessLoading) return null;
  if (leads.length === 0) return null;

  const approvedCount = leads.filter((l) => getStatus(l.id) === "approved").length;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Website Leads (Contact Access Control)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">Request admin approval to view lead contact details</p>
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <Button size="sm" onClick={openBulkRequestModal} className="gap-1">
                  <Send className="h-3.5 w-3.5" /> Request ({selectedIds.size})
                </Button>
              )}
              {approvedCount > 0 && (
                <Button size="sm" variant="outline" onClick={downloadCSV} className="gap-1">
                  <Download className="h-3.5 w-3.5" /> Download CSV
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    {selectableIds.size > 0 && (
                      <Checkbox
                        checked={selectedIds.size === selectableIds.size && selectableIds.size > 0}
                        onCheckedChange={toggleAll}
                      />
                    )}
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Contact Status</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => {
                  const status = getStatus(lead.id);
                  const isSelectable = status === "hidden";
                  return (
                    <TableRow key={lead.id}>
                      <TableCell>
                        {isSelectable ? (
                          <Checkbox
                            checked={selectedIds.has(lead.id)}
                            onCheckedChange={() => toggleSelect(lead.id)}
                          />
                        ) : null}
                      </TableCell>
                      <TableCell className="font-medium text-foreground whitespace-nowrap">{maskName(lead.name, lead.id, status === "approved")}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">{new Date(lead.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>{statusBadge(status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {status === "approved" ? (
                          <div className="space-y-0.5 text-xs">
                            <p>{lead.email}</p>
                            <p>{lead.whatsapp}</p>
                          </div>
                        ) : (
                          <span className="text-xs">••••••••</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {status === "hidden" ? (
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => {
                            setSelectedIds(new Set([lead.id]));
                            setPurpose("follow_up");
                            setModalOpen(true);
                          }}>
                            <Send className="h-3.5 w-3.5" /> Request
                          </Button>
                        ) : status === "requested" ? (
                          <span className="text-xs text-yellow-400">Pending review</span>
                        ) : (
                          <span className="text-xs text-green-400">Access granted</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Contact Details ({selectedIds.size} lead{selectedIds.size > 1 ? "s" : ""})</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Selected Leads</Label>
              <div className="flex flex-wrap gap-1.5">
                {[...selectedIds].map((id) => {
                  const lead = leads.find((l) => l.id === id);
                  return lead ? (
                    <Badge key={id} variant="secondary" className="text-xs">{maskName(lead.name, lead.id, getStatus(lead.id) === "approved")}</Badge>
                  ) : null;
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Purpose</Label>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                  <SelectItem value="enrollment">Enrollment Discussion</SelectItem>
                  <SelectItem value="support">Support / Query</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkSubmit} disabled={submitting}>
              {submitting ? "Sending..." : `Send ${selectedIds.size} Request${selectedIds.size > 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CoachWebsiteLeads;
