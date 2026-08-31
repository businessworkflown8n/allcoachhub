import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Video, Image as ImgIcon, Type, Link as LinkIcon, Package, ExternalLink } from "lucide-react";

const TYPE_ICONS: Record<string, any> = {
  document: FileText, video: Video, image: ImgIcon, text: Type, link: LinkIcon, physical: Package,
};

interface PurchaseRow {
  id: string;
  payment_status: string;
  delivery_status: string;
  amount_paid: number;
  currency: string;
  created_at: string;
  product: {
    id: string;
    title: string;
    description: string | null;
    product_type: string;
    content_url: string | null;
    content_text: string | null;
    cover_image_url: string | null;
  } | null;
}

const LearnerPurchases = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("digital_product_orders")
      .select("id, payment_status, delivery_status, amount_paid, currency, created_at, product:digital_products(id, title, description, product_type, content_url, content_text, cover_image_url, linked_course_id, linked_webinar_id, linked_workshop_id)")
      .eq("buyer_id", user.id)
      .eq("payment_status", "paid")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        // Standalone purchases only — course/webinar/workshop-linked ones already show up
        // in My Courses / Webinars, so listing them again here would be confusing.
        const standalone = (data || []).filter((r: any) => r.product && !r.product.linked_course_id && !r.product.linked_webinar_id && !r.product.linked_workshop_id);
        setRows(standalone as any);
        setLoading(false);
      });
  }, [user]);

  if (loading) return <div className="text-foreground">Loading…</div>;

  if (rows.length === 0) {
    return (
      <Card className="p-10 text-center">
        <h2 className="text-xl font-bold text-foreground">No purchases yet</h2>
        <p className="text-sm text-muted-foreground mt-2">Digital products, guides, and templates you buy from coaches will show up here.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">My Purchases</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.map((r) => {
          const p = r.product;
          if (!p) return null;
          const Icon = TYPE_ICONS[p.product_type] || FileText;
          return (
            <Card key={r.id} className="p-4 space-y-3">
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                {p.cover_image_url ? <img src={p.cover_image_url} alt={p.title} className="w-full h-full object-cover" /> : <Icon className="h-10 w-10 text-muted-foreground" />}
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-foreground truncate">{p.title}</div>
                  <div className="text-xs text-muted-foreground capitalize">{p.product_type}</div>
                </div>
                <Badge variant={r.delivery_status === "delivered" ? "default" : "outline"}>{r.delivery_status}</Badge>
              </div>
              {r.delivery_status === "delivered" ? (
                p.product_type === "text" ? (
                  <p className="text-sm text-foreground whitespace-pre-line max-h-40 overflow-y-auto">{p.content_text}</p>
                ) : p.content_url ? (
                  <Button size="sm" className="w-full" asChild>
                    <a href={p.content_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" /> Open
                    </a>
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">No content attached to this purchase.</p>
                )
              ) : (
                <p className="text-xs text-muted-foreground">The coach will fulfil this order shortly.</p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default LearnerPurchases;
