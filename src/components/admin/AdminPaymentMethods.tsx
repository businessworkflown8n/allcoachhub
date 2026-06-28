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

export default function AdminPaymentMethods() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>
            Configure how each course or webinar accepts payment. Choose Razorpay Checkout (default in-app popup),
            a hosted Razorpay Payment Link, Free, Manual / Offline, or any External URL. Changes apply instantly
            on the public site — no code changes required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="courses">
            <TabsList>
              <TabsTrigger value="courses">Courses</TabsTrigger>
              <TabsTrigger value="webinars">Webinars</TabsTrigger>
            </TabsList>
            <TabsContent value="courses" className="pt-4">
              <ItemTable kind="courses" />
            </TabsContent>
            <TabsContent value="webinars" className="pt-4">
              <ItemTable kind="webinars" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
