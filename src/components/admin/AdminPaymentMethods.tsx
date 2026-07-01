import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, ExternalLink } from "lucide-react";

type PaymentMethod = "razorpay_api" | "payment_link" | "free" | "manual" | "external";

const METHODS: { value: PaymentMethod; label: string; description: string }[] = [
  { value: "razorpay_api", label: "Razorpay Checkout (default)", description: "In-app Razorpay popup checkout" },
  { value: "payment_link", label: "Razorpay Payment Link", description: "Redirect to a hosted Razorpay payment link" },
  { value: "free", label: "Free", description: "No payment, instant enrollment" },
  { value: "manual", label: "Manual / Offline", description: "Mark as pending; admin confirms manually" },
  { value: "external", label: "External URL", description: "Redirect to an external payment provider URL" },
];

type Row = {
  id: string;
  title: string;
  price_inr: number | null;
  price_usd: number | null;
  payment_method: PaymentMethod | null;
  payment_link_url: string | null;
  is_published?: boolean | null;
};

function methodBadge(m: PaymentMethod | null) {
  const cur = METHODS.find((x) => x.value === (m ?? "razorpay_api"));
  return <Badge variant="outline">{cur?.label ?? "Razorpay Checkout"}</Badge>;
}

const ItemTable = ({ kind }: { kind: "courses" | "webinars" }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, Partial<Row>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const load = async () => {
    setLoading(true);
    const sb: any = supabase;
    const { data, error } = await sb
      .from(kind)
      .select("id, title, price_inr, price_usd, payment_method, payment_link_url, is_published")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    }
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const setEdit = (id: string, patch: Partial<Row>) => {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const save = async (row: Row) => {
    const patch = edits[row.id];
    if (!patch) return;
    const next: Partial<Row> = {
      payment_method: (patch.payment_method ?? row.payment_method) ?? null,
      payment_link_url: patch.payment_link_url ?? row.payment_link_url ?? null,
    };

    if (
      (next.payment_method === "payment_link" || next.payment_method === "external") &&
      !(next.payment_link_url && /^https?:\/\//i.test(next.payment_link_url))
    ) {
      toast({
        title: "URL required",
        description: "Provide a valid https:// payment link for this method.",
        variant: "destructive",
      });
      return;
    }

    setSavingId(row.id);
    const sb: any = supabase;
    const { error } = await sb.from(kind).update(next).eq("id", row.id);
    setSavingId(null);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Saved", description: `${kind === "courses" ? "Course" : "Webinar"} payment method updated.` });
    setEdits((prev) => {
      const { [row.id]: _, ...rest } = prev;
      return rest;
    });
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...next } as Row : r)));
  };

  const visible = rows.filter((r) => r.title?.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-4">
      <Input
        placeholder={`Search ${kind}...`}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="max-w-sm"
      />
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[220px]">Title</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="min-w-[220px]">Payment Method</TableHead>
              <TableHead className="min-w-[280px]">Payment Link / URL</TableHead>
              <TableHead>Current</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
            ) : visible.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No {kind} found.</TableCell></TableRow>
            ) : (
              visible.map((row) => {
                const edit = edits[row.id] ?? {};
                const method = (edit.payment_method ?? row.payment_method ?? "razorpay_api") as PaymentMethod;
                const url = edit.payment_link_url ?? row.payment_link_url ?? "";
                const dirty = !!edits[row.id];
                const needsUrl = method === "payment_link" || method === "external";
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.price_inr ? `₹${row.price_inr}` : ""}{row.price_inr && row.price_usd ? " / " : ""}{row.price_usd ? `$${row.price_usd}` : ""}
                      {!row.price_inr && !row.price_usd ? "Free" : ""}
                    </TableCell>
                    <TableCell>
                      <Select value={method} onValueChange={(v) => setEdit(row.id, { payment_method: v as PaymentMethod })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {METHODS.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                              <div className="flex flex-col">
                                <span>{m.label}</span>
                                <span className="text-xs text-muted-foreground">{m.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder={needsUrl ? "https://razorpay.com/payment-link/..." : "—"}
                          value={url}
                          onChange={(e) => setEdit(row.id, { payment_link_url: e.target.value })}
                          disabled={!needsUrl}
                        />
                        {url && (
                          <a href={url} target="_blank" rel="noreferrer" aria-label="Open link">
                            <Button variant="ghost" size="icon"><ExternalLink className="h-4 w-4" /></Button>
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{methodBadge(row.payment_method)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" disabled={!dirty || savingId === row.id} onClick={() => save(row)}>
                        <Save className="h-4 w-4 mr-1" /> {savingId === row.id ? "Saving..." : "Save"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

type PlanRow = {
  id: string;
  name: string;
  slug: string;
  price: number | null;
  yearly_price: number | null;
  yearly_discount_percent: number | null;
  monthly_billing_enabled: boolean | null;
  yearly_billing_enabled: boolean | null;
  sort_order: number | null;
  currency: string | null;
  billing_interval: string | null;
  payment_method: string | null;
  payment_link_url: string | null;
  razorpay_plan_id_monthly: string | null;
  razorpay_plan_id_yearly: string | null;
  is_recurring: boolean | null;
  tax_percent: number | null;
  trial_days: number | null;
  is_active: boolean | null;
};

const PLAN_METHODS = [
  { value: "razorpay_api", label: "Razorpay Checkout" },
  { value: "payment_link", label: "Razorpay Payment Link" },
  { value: "razorpay_subscription", label: "Razorpay Subscription (Recurring)" },
  { value: "stripe", label: "Stripe" },
  { value: "paypal", label: "PayPal" },
  { value: "manual", label: "Manual Payment" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "free", label: "Free" },
  { value: "external", label: "External URL" },
];

const SubscriptionPlansTable = () => {
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [edits, setEdits] = useState<Record<string, Partial<PlanRow>>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const sb: any = supabase;
    const { data, error } = await sb.from("subscription_plans")
      .select("id,name,slug,price,yearly_price,yearly_discount_percent,monthly_billing_enabled,yearly_billing_enabled,sort_order,currency,billing_interval,payment_method,payment_link_url,razorpay_plan_id_monthly,razorpay_plan_id_yearly,is_recurring,tax_percent,trial_days,is_active")
      .order("sort_order", { ascending: true });
    if (error) toast({ title: "Failed to load plans", description: error.message, variant: "destructive" });
    setRows((data ?? []) as PlanRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const setEdit = (id: string, patch: Partial<PlanRow>) =>
    setEdits((p) => ({ ...p, [id]: { ...p[id], ...patch } }));

  const save = async (row: PlanRow) => {
    const patch = edits[row.id];
    if (!patch) return;
    setSavingId(row.id);
    const sb: any = supabase;
    const { error } = await sb.from("subscription_plans").update(patch).eq("id", row.id);
    setSavingId(null);
    if (error) return toast({ title: "Save failed", description: error.message, variant: "destructive" });
    toast({ title: "Plan saved" });
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...patch } as PlanRow : r)));
    setEdits((prev) => { const { [row.id]: _, ...rest } = prev; return rest; });
  };

  if (loading) return <div className="text-center text-muted-foreground py-8">Loading plans...</div>;

  return (
    <div className="space-y-4">
      {rows.map((row) => {
        const e = edits[row.id] ?? {};
        const val = <K extends keyof PlanRow>(k: K): any => (e[k] !== undefined ? e[k] : row[k]);
        const dirty = !!edits[row.id];
        const method = String(val("payment_method") ?? "razorpay_api");
        const needsUrl = method === "payment_link" || method === "external";
        const needsRzpPlan = method === "razorpay_subscription";
        return (
          <Card key={row.id}>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">{row.name} <Badge variant="outline" className="ml-2">{row.slug}</Badge></CardTitle>
                <CardDescription>{row.is_active ? "Active" : "Inactive"}</CardDescription>
              </div>
              <Button size="sm" disabled={!dirty || savingId === row.id} onClick={() => save(row)}>
                <Save className="h-4 w-4 mr-1" /> {savingId === row.id ? "Saving..." : "Save"}
              </Button>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="text-xs text-muted-foreground">Monthly Price</label>
                <Input type="number" value={val("price") ?? ""} onChange={(ev) => setEdit(row.id, { price: ev.target.value === "" ? null : Number(ev.target.value) })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Yearly Price</label>
                <Input type="number" value={val("yearly_price") ?? ""} onChange={(ev) => setEdit(row.id, { yearly_price: ev.target.value === "" ? null : Number(ev.target.value) })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Currency</label>
                <Input value={val("currency") ?? "INR"} onChange={(ev) => setEdit(row.id, { currency: ev.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tax (GST %)</label>
                <Input type="number" value={val("tax_percent") ?? 0} onChange={(ev) => setEdit(row.id, { tax_percent: Number(ev.target.value) })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Trial Days</label>
                <Input type="number" value={val("trial_days") ?? 0} onChange={(ev) => setEdit(row.id, { trial_days: Number(ev.target.value) })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Default Billing Cycle</label>
                <Select value={String(val("billing_interval") ?? "monthly")} onValueChange={(v) => setEdit(row.id, { billing_interval: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                    <SelectItem value="lifetime">Lifetime</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground">Payment Method</label>
                <Select value={method} onValueChange={(v) => setEdit(row.id, { payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLAN_METHODS.map((m) => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Auto Renewal</label>
                <Select value={val("is_recurring") ? "true" : "false"} onValueChange={(v) => setEdit(row.id, { is_recurring: v === "true" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">On</SelectItem>
                    <SelectItem value="false">Off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {needsUrl && (
                <div className="md:col-span-3">
                  <label className="text-xs text-muted-foreground">Payment Link URL</label>
                  <Input placeholder="https://razorpay.com/payment-link/..." value={val("payment_link_url") ?? ""} onChange={(ev) => setEdit(row.id, { payment_link_url: ev.target.value })} />
                </div>
              )}
              {needsRzpPlan && (
                <>
                  <div className="md:col-span-3 grid md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Razorpay Plan ID (Monthly)</label>
                      <Input value={val("razorpay_plan_id_monthly") ?? ""} onChange={(ev) => setEdit(row.id, { razorpay_plan_id_monthly: ev.target.value })} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Razorpay Plan ID (Yearly)</label>
                      <Input value={val("razorpay_plan_id_yearly") ?? ""} onChange={(ev) => setEdit(row.id, { razorpay_plan_id_yearly: ev.target.value })} />
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                <Select value={val("is_active") ? "true" : "false"} onValueChange={(v) => setEdit(row.id, { is_active: v === "true" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default function AdminPaymentMethods() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>
            Configure how each course, webinar, or subscription plan accepts payment. Changes apply instantly — no code required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="courses">
            <TabsList>
              <TabsTrigger value="courses">Courses</TabsTrigger>
              <TabsTrigger value="webinars">Webinars</TabsTrigger>
              <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            </TabsList>
            <TabsContent value="courses" className="pt-4">
              <ItemTable kind="courses" />
            </TabsContent>
            <TabsContent value="webinars" className="pt-4">
              <ItemTable kind="webinars" />
            </TabsContent>
            <TabsContent value="subscriptions" className="pt-4">
              <SubscriptionPlansTable />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
