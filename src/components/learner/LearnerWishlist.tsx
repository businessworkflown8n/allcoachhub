import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { Heart, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import PriceDisplay from "@/components/shared/PriceDisplay";

const LearnerWishlist = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = async () => {
    if (!user) return;
    const { data } = await supabase.from("wishlists").select("*, courses(*)").eq("learner_id", user.id);
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchWishlist(); }, [user]);

  const remove = async (id: string) => {
    await supabase.from("wishlists").delete().eq("id", id);
    setItems(items.filter((i) => i.id !== id));
    toast({ title: "Removed from wishlist" });
  };

  if (loading) return <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mt-8" />;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">Wishlist</h2>
      {items.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Your wishlist is empty</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <span className="text-xs text-primary">{(item.courses as any)?.category}</span>
              <h3 className="text-sm font-bold text-foreground">{(item.courses as any)?.title}</h3>
              <PriceDisplay priceInr={(item.courses as any)?.price_inr} priceUsd={(item.courses as any)?.price_usd} size="md" />
              <div className="flex gap-2">
                <Link to={`/course/${(item.courses as any)?.slug || (item.courses as any)?.id}`} className="flex-1 rounded-lg bg-primary py-2 text-center text-xs font-semibold text-primary-foreground hover:brightness-110">
                  View Course
                </Link>
                <button onClick={() => remove(item.id)} className="rounded-lg border border-border px-3 py-2 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LearnerWishlist;
