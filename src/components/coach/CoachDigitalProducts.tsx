import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Routes, Route, Navigate, useNavigate, useParams, Link } from "react-router-dom";
import { useDigitalProductAccess } from "@/hooks/useDigitalProductAccess";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileText, Video, Image as ImgIcon, Type, Link as LinkIcon, Package, Lock, Plus, Trash2 } from "lucide-react";

const TYPE_ICONS: Record<string, any> = {
  document: FileText, video: Video, image: ImgIcon, text: Type, link: LinkIcon, physical: Package,
};

function UpgradeLock() {
  return (
    <Card className="p-8 text-center max-w-xl mx-auto">
      <Lock className="h-10 w-10 mx-auto text-primary mb-3" />
      <h2 className="text-xl font-bold text-foreground">Upgrade to publish your digital product</h2>
      <ul className="text-sm text-muted-foreground my-4 space-y-1">
        <li>• Build your own product page</li>
        <li>• Custom pricing & discounts</li>
        <li>• Integrated payments</li>
        <li>• Unlimited learners</li>
      </ul>
      <div className="flex justify-center gap-2">
        <Button variant="outline" onClick={async () => {
          await supabase.from("notification_requests" as any).insert({
            title: "Digital Products Access Request",
            message: "Coach is requesting access to Digital Products module.",
            audience_type: "all_learners",
          } as any).then(() => {});
        }}>Request Access</Button>
        <Button asChild><a href="mailto:admin@aicoachportal.com">Talk to Admin</a></Button>
      </div>
    </Card>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="p-10 text-center">
      <h2 className="text-2xl font-bold text-foreground">Sell anything in a few steps</h2>
      <ol className="text-sm text-muted-foreground my-6 space-y-2 max-w-md mx-auto text-left">
        <li>1. Attach the content that you want to sell</li>
        <li>2. Set the price and details</li>
        <li>3. Publish and start earning</li>
      </ol>
      <Button onClick={onCreate}><Plus className="h-4 w-4 mr-1" /> Create a digital product</Button>
    </Card>
  );
}

function ProductList() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase.from("digital_products").select("*").eq("coach_id", u.user.id).order("created_at", { ascending: false });
    setProducts(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await supabase.from("digital_products").delete().eq("id", id);
    load();
  };
  const duplicate = async (p: any) => {
    const { id, created_at, updated_at, views_count, sales_count, status, approval_status, ...rest } = p;
    await supabase.from("digital_products").insert({ ...rest, title: `${p.title} (copy)`.slice(0,55), status: "draft", approval_status: "pending" });
    load();
  };

  if (loading) return <div className="text-foreground">Loading…</div>;
  if (products.length === 0) return <EmptyState onCreate={() => navigate("/coach/digital-products/new")} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Digital Products</h2>
        <Button onClick={() => navigate("/coach/digital-products/new")}><Plus className="h-4 w-4 mr-1" /> New product</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(p => {
          const Icon = TYPE_ICONS[p.product_type] || FileText;
          return (
            <Card key={p.id} className="p-4 space-y-3">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                {p.cover_image_url ? <img src={p.cover_image_url} alt={p.title} className="w-full h-full object-cover" /> : <Icon className="h-10 w-10 text-muted-foreground" />}
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-foreground truncate">{p.title}</div>
                  <div className="text-xs text-muted-foreground capitalize">{p.product_type}</div>
                </div>
                <Badge variant={p.status === "published" ? "default" : "outline"}>{p.status}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">{p.is_paid ? `${p.currency} ${p.discount_price ?? p.price}` : "Free"}</span>
                <span className="text-muted-foreground">{p.sales_count} sales</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/coach/digital-products/${p.id}/edit`)}>Edit</Button>
                <Button size="sm" variant="outline" onClick={() => duplicate(p)}>Duplicate</Button>
                <Button size="sm" variant="outline" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { access } = useDigitalProductAccess();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    title: "", description: "", product_type: "", content_url: "", content_text: "",
    cover_image_url: "", faq: [], tags: [], is_paid: false, price: "", discount_price: "",
    currency: "INR", pass_gateway_fees: false, limited_time: false,
  });

  useEffect(() => {
    if (!id) return;
    supabase.from("digital_products").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      if (data) setForm({ ...data, price: data.price ?? "", discount_price: data.discount_price ?? "" });
    });
  }, [id]);

  const update = (patch: any) => setForm({ ...form, ...patch });

  const save = async (publish = false) => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const payload: any = {
      coach_id: u.user.id,
      title: form.title.slice(0,55),
      description: form.description,
      product_type: form.product_type,
      content_url: form.content_url || null,
      content_text: form.content_text || null,
      cover_image_url: form.cover_image_url || null,
      faq: form.faq,
      tags: form.tags,
      is_paid: form.is_paid,
      price: form.is_paid && form.price !== "" ? Number(form.price) : null,
      discount_price: form.is_paid && form.discount_price !== "" ? Number(form.discount_price) : null,
      currency: form.currency,
      pass_gateway_fees: form.pass_gateway_fees,
      limited_time: form.limited_time,
      status: publish ? (access.require_approval ? "pending" : "published") : "draft",
      approval_status: publish && !access.require_approval ? "approved" : "pending",
    };
    const res = id
      ? await supabase.from("digital_products").update(payload).eq("id", id)
      : await supabase.from("digital_products").insert(payload);
    setSaving(false);
    if (res.error) {
      toast({ title: "Save failed", description: res.error.message, variant: "destructive" });
      return;
    }
    toast({ title: publish ? (access.require_approval ? "Submitted for approval" : "Published") : "Draft saved" });
    navigate("/coach/digital-products");
  };

  const allowedTypes = (access.allowed_types || []).filter(Boolean);
  const finalPrice = form.is_paid && form.price ? Number(form.discount_price || form.price) : 0;
  const youReceive = finalPrice * (1 - (access.platform_commission_percent || 0) / 100);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-sm">
        {[1,2,3].map(n => (
          <div key={n} className={`flex-1 h-1 rounded ${step >= n ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>
      <div className="text-sm text-muted-foreground">Step {step} of 3 — {step===1?"Content type":step===2?"Details":"Pricing"}</div>

      {step === 1 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Choose content type</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {allowedTypes.map((t: string) => {
              const Icon = TYPE_ICONS[t] || FileText;
              const selected = form.product_type === t;
              return (
                <button key={t} onClick={() => update({ product_type: t })}
                  className={`p-4 rounded-lg border text-left transition ${selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
                  <Icon className="h-6 w-6 text-foreground mb-2" />
                  <div className="font-medium text-foreground capitalize">{t}</div>
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex justify-end">
            <Button disabled={!form.product_type} onClick={() => setStep(2)}>Save & Continue</Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-6 space-y-4">
          <div>
            <Label>Title <span className="text-xs text-muted-foreground">({form.title.length}/55)</span></Label>
            <Input maxLength={55} value={form.title} onChange={e => update({ title: e.target.value })} />
          </div>
          <div>
            <Label>Cover image URL</Label>
            <Input value={form.cover_image_url} onChange={e => update({ cover_image_url: e.target.value })} placeholder="https://…" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={5} value={form.description} onChange={e => update({ description: e.target.value })} />
          </div>
          {form.product_type === "link" && (
            <div><Label>External link</Label><Input value={form.content_url} onChange={e => update({ content_url: e.target.value })} /></div>
          )}
          {form.product_type === "text" && (
            <div><Label>Content</Label><Textarea rows={6} value={form.content_text} onChange={e => update({ content_text: e.target.value })} /></div>
          )}
          {["document","video","image"].includes(form.product_type) && (
            <div><Label>Content URL (uploaded file URL)</Label><Input value={form.content_url} onChange={e => update({ content_url: e.target.value })} /></div>
          )}
          {form.product_type === "physical" && (
            <div><Label>Shipping note</Label><Textarea rows={3} value={form.content_text} onChange={e => update({ content_text: e.target.value })} /></div>
          )}
          <div>
            <Label>Tags (comma-separated)</Label>
            <Input value={(form.tags || []).join(", ")} onChange={e => update({ tags: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })} />
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => save(false)} disabled={saving || !form.title}>Save draft</Button>
              <Button onClick={() => setStep(3)} disabled={!form.title}>Save & Continue</Button>
            </div>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Label>Paid product</Label>
            <Switch checked={form.is_paid} onCheckedChange={(v) => update({ is_paid: v })} disabled={!access.allow_paid} />
          </div>
          {form.is_paid && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Price</Label><Input type="number" value={form.price} onChange={e => update({ price: e.target.value })} /></div>
                {access.allow_discount && <div><Label>Discounted price</Label><Input type="number" value={form.discount_price} onChange={e => update({ discount_price: e.target.value })} /></div>}
              </div>
              <div className="flex items-center justify-between">
                <Label>Pass payment gateway fees to learner</Label>
                <Switch checked={form.pass_gateway_fees} onCheckedChange={(v) => update({ pass_gateway_fees: v })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Limited time availability</Label>
                <Switch checked={form.limited_time} onCheckedChange={(v) => update({ limited_time: v })} />
              </div>
              <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Final payable price</span><span className="text-foreground">{form.currency} {finalPrice}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">You will receive (after {access.platform_commission_percent}% fee)</span><span className="text-foreground">{form.currency} {youReceive.toFixed(2)}</span></div>
              </div>
            </>
          )}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => save(false)} disabled={saving}>Save draft</Button>
              <Button onClick={() => save(true)} disabled={saving}>{access.require_approval ? "Submit for approval" : "Publish"}</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

const CoachDigitalProducts = () => {
  const { access, loading } = useDigitalProductAccess();

  if (loading) return <div className="text-foreground">Loading…</div>;
  if (!access.enabled) return <UpgradeLock />;

  return (
    <Routes>
      <Route index element={<ProductList />} />
      <Route path="new" element={<ProductForm />} />
      <Route path=":id/edit" element={<ProductForm />} />
      <Route path="*" element={<Navigate to="" replace />} />
    </Routes>
  );
};

export default CoachDigitalProducts;
