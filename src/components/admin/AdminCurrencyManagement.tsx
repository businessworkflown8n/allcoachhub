import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Check, X, Globe } from "lucide-react";
import {
  useAllCurrencies,
  useCurrencyMutations,
  useCoachCurrencyRequests,
  useReviewRequest,
  type Currency,
  type CoachCurrencyRequest,
} from "@/hooks/useCurrencies";

const emptyCurrency: Partial<Currency> = {
  currency_name: "",
  currency_code: "",
  currency_symbol: "",
  country: "",
  exchange_rate: 1,
  is_active: true,
  is_default: false,
};

const AdminCurrencyManagement = () => {
  const { data: currencies = [], isLoading } = useAllCurrencies();
  const { data: requests = [] } = useCoachCurrencyRequests();
  const { add, update, remove } = useCurrencyMutations();
  const review = useReviewRequest();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Currency | null>(null);
  const [form, setForm] = useState<Partial<Currency>>(emptyCurrency);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const openAdd = () => {
    setEditing(null);
    setForm(emptyCurrency);
    setOpen(true);
  };
  const openEdit = (c: Currency) => {
    setEditing(c);
    setForm(c);
    setOpen(true);
  };

  const save = async () => {
    if (!form.currency_name || !form.currency_code || !form.currency_symbol) {
      toast.error("Name, code and symbol are required");
      return;
    }
    try {
      const payload = {
        ...form,
        currency_code: form.currency_code!.toUpperCase(),
        exchange_rate: Number(form.exchange_rate) || 1,
      };
      if (editing) {
        await update.mutateAsync({ id: editing.id, patch: payload });
        toast.success("Currency updated");
      } else {
        await add.mutateAsync(payload);
        toast.success("Currency added");
      }
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    }
  };

  const handleDelete = async (c: Currency) => {
    if (c.currency_code === "INR") {
      toast.error("INR cannot be deleted");
      return;
    }
    if (!confirm(`Delete ${c.currency_code}?`)) return;
    try {
      await remove.mutateAsync(c.id);
      toast.success("Deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleToggleActive = async (c: Currency, val: boolean) => {
    try {
      await update.mutateAsync({ id: c.id, patch: { is_active: val } });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSetDefault = async (c: Currency) => {
    try {
      await update.mutateAsync({ id: c.id, patch: { is_default: true, is_active: true } });
      toast.success(`${c.currency_code} set as default`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleReview = async (r: CoachCurrencyRequest, action: "approve" | "reject") => {
    try {
      await review.mutateAsync({
        id: r.id,
        coach_id: r.coach_id,
        requested_currency: r.requested_currency,
        action,
        notes: reviewNotes[r.id],
      });
      toast.success(`Request ${action}d`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const activeCount = currencies.filter((c) => c.is_active).length;
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const defaultCurrency = currencies.find((c) => c.is_default);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Currency Management</h1>
          <p className="text-sm text-muted-foreground">Manage platform currencies and coach requests</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" /> Add Currency
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Active Currencies</div>
          <div className="text-2xl font-bold mt-1">{activeCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Pending Requests</div>
          <div className="text-2xl font-bold mt-1">{pendingCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Default Currency</div>
          <div className="text-2xl font-bold mt-1">
            {defaultCurrency ? `${defaultCurrency.currency_symbol} ${defaultCurrency.currency_code}` : "—"}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Total Currencies</div>
          <div className="text-2xl font-bold mt-1">{currencies.length}</div>
        </Card>
      </div>

      <Tabs defaultValue="currencies">
        <TabsList>
          <TabsTrigger value="currencies">Currencies</TabsTrigger>
          <TabsTrigger value="requests">
            Coach Requests {pendingCount > 0 && <Badge className="ml-2">{pendingCount}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="currencies">
          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Currency</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Rate (vs INR)</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {currencies.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.currency_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{c.currency_code}</Badge>
                    </TableCell>
                    <TableCell>{c.currency_symbol}</TableCell>
                    <TableCell>{c.country ?? "—"}</TableCell>
                    <TableCell>{c.exchange_rate}</TableCell>
                    <TableCell>
                      <Switch
                        checked={c.is_active}
                        disabled={c.currency_code === "INR"}
                        onCheckedChange={(v) => handleToggleActive(c, v)}
                      />
                    </TableCell>
                    <TableCell>
                      {c.is_default ? (
                        <Badge>Default</Badge>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => handleSetDefault(c)}>
                          Set
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={c.currency_code === "INR"}
                        onClick={() => handleDelete(c)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coach ID</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Admin Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      <Globe className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      No requests yet
                    </TableCell>
                  </TableRow>
                )}
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.coach_id.slice(0, 8)}…</TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.requested_currency}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.status === "pending" ? "secondary" : r.status === "approved" ? "default" : "destructive"}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {r.status === "pending" ? (
                        <Input
                          placeholder="Notes (optional)"
                          value={reviewNotes[r.id] ?? ""}
                          onChange={(e) => setReviewNotes((s) => ({ ...s, [r.id]: e.target.value }))}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">{r.admin_notes ?? "—"}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === "pending" && (
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" onClick={() => handleReview(r, "approve")}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => handleReview(r, "reject")}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Currency" : "Add Currency"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Currency Name</Label>
              <Input value={form.currency_name ?? ""} onChange={(e) => setForm({ ...form, currency_name: e.target.value })} />
            </div>
            <div>
              <Label>Code</Label>
              <Input
                value={form.currency_code ?? ""}
                onChange={(e) => setForm({ ...form, currency_code: e.target.value.toUpperCase() })}
                disabled={editing?.currency_code === "INR"}
                maxLength={5}
              />
            </div>
            <div>
              <Label>Symbol</Label>
              <Input value={form.currency_symbol ?? ""} onChange={(e) => setForm({ ...form, currency_symbol: e.target.value })} />
            </div>
            <div>
              <Label>Country</Label>
              <Input value={form.country ?? ""} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
            <div>
              <Label>Exchange Rate (vs INR)</Label>
              <Input
                type="number"
                step="0.000001"
                value={form.exchange_rate ?? 1}
                onChange={(e) => setForm({ ...form, exchange_rate: Number(e.target.value) })}
              />
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <Switch
                checked={!!form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                disabled={form.currency_code === "INR"}
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCurrencyManagement;
