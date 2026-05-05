import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import FeatureGate from "@/components/shared/FeatureGate";
import { useCoachPlan } from "@/hooks/useCoachPlan";

interface Props { open: boolean; onClose: () => void; }

const CouponManager = ({ open, onClose }: Props) => {
  const { user } = useAuth();
  const { plan } = useCoachPlan();
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", discount_percent: "10", expiry_date: "", course_id: "" });

  const fetchData = async () => {
    if (!user) return;
    const [cRes, couponRes] = await Promise.all([
      supabase.from("courses").select("id, title").eq("coach_id", user.id),
      supabase.from("coupons").select("*").eq("coach_id", user.id).order("created_at", { ascending: false }),
    ]);
    setCourses(cRes.data || []);
    setCoupons(couponRes.data || []);
  };

  useEffect(() => { if (open) fetchData(); }, [open, user]);

  const handleCreate = async () => {
    if (!form.code.trim()) { toast.error("Coupon code is required"); return; }
    setLoading(true);
    const { error } = await supabase.from("coupons").insert({
      coach_id: user!.id,
      code: form.code.toUpperCase().trim(),
      discount_percent: Number(form.discount_percent) || 10,
      expiry_date: form.expiry_date || null,
      course_id: form.course_id || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Coupon created!"); setForm({ code: "", discount_percent: "10", expiry_date: "", course_id: "" }); setShowForm(false); fetchData(); }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("coupons").delete().eq("id", id);
    toast.success("Coupon deleted");
    fetchData();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Offers & Coupons</DialogTitle>
        </DialogHeader>

        <FeatureGate featureKey="coupons_management" featureName="Coupons" plan={plan}>
        <div className="space-y-4">
          {!showForm ? (
            <Button onClick={() => setShowForm(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" /> New Coupon
            </Button>
          ) : (
            <div className="space-y-3 rounded-lg border border-border bg-secondary/30 p-4">
              <Input placeholder="Coupon Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              <Input type="number" placeholder="Discount %" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} min="1" max="100" />
              <Input type="date" placeholder="Expiry Date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
              <Select value={form.course_id} onValueChange={(v) => setForm({ ...form, course_id: v })}>
                <SelectTrigger><SelectValue placeholder="Apply to program (optional)" /></SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={loading} className="flex-1">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Coupon Table */}
          {coupons.length > 0 && (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="text-left p-2 text-muted-foreground font-medium">Code</th>
                    <th className="text-left p-2 text-muted-foreground font-medium">Discount</th>
                    <th className="text-left p-2 text-muted-foreground font-medium">Used</th>
                    <th className="text-left p-2 text-muted-foreground font-medium">Revenue</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr key={c.id} className="border-t border-border">
                      <td className="p-2 font-mono text-primary text-xs">{c.code}</td>
                      <td className="p-2 text-foreground">{c.discount_percent}%</td>
                      <td className="p-2 text-foreground">{c.usage_count}</td>
                      <td className="p-2 text-foreground">${Number(c.revenue_generated).toFixed(0)}</td>
                      <td className="p-2">
                        <button onClick={() => handleDelete(c.id)} className="text-destructive hover:text-destructive/80">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </FeatureGate>
      </DialogContent>
    </Dialog>
  );
};

export default CouponManager;
