import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Skeleton } from "@/components/ui/skeleton";

interface CategoryWithCount {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  coachCount: number;
}

const Categories = () => {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useSEO({
    title: "All Categories – AI Coach Portal",
    description: "Browse all coaching categories. Find expert coaches in Career, Coding, Wellness, Marketing, and more.",
    canonical: "https://www.aicoachportal.com/categories",
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: cats } = await supabase
        .from("coach_categories")
        .select("id, name, slug, icon, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (!cats) { setLoading(false); return; }

      const { data: courses } = await supabase
        .from("courses")
        .select("category")
        .eq("is_published", true)
        .eq("approval_status", "approved");

      const counts: Record<string, number> = {};
      (courses || []).forEach((c: any) => {
        const key = (c.category || "Others").toLowerCase();
        counts[key] = (counts[key] || 0) + 1;
      });

      setCategories(cats.map((c) => ({ ...c, coachCount: counts[c.name.toLowerCase()] || 0 })));
      setLoading(false);
    };
    fetchData();

    const channel = supabase
      .channel("categories-page-courses")
      .on("postgres_changes", { event: "*", schema: "public", table: "courses" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-10 text-center">
            <h1 className="mb-3 text-4xl font-bold text-foreground">Explore All Categories</h1>
            <p className="text-lg text-muted-foreground">Find the perfect coach to level up your skills</p>
          </div>

          {loading ? (
            <div className="mx-auto grid max-w-6xl grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 15 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="mx-auto grid max-w-6xl grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/categories/${cat.slug}`}
                  className="group cursor-pointer rounded-xl border border-border bg-card p-5 text-center transition-all duration-200 hover:scale-[1.03] hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 sm:p-6"
                >
                  <div className="mb-3 text-3xl sm:text-4xl">{cat.icon || "📂"}</div>
                  <h3 className="mb-1 text-sm font-semibold text-foreground group-hover:text-primary">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {cat.coachCount} {cat.coachCount === 1 ? "coach" : "coaches"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Categories;
