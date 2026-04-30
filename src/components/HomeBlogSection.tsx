import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, ArrowRight, Sparkles } from "lucide-react";
import { format } from "date-fns";

type BlogPreview = {
  id: string;
  title: string;
  excerpt: string;
  image_url: string | null;
  published_at: string;
  slug: string | null;
  category: string;
};

const HomeBlogSection = () => {
  const [blogs, setBlogs] = useState<BlogPreview[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("ai_blogs")
        .select("id, title, excerpt, image_url, published_at, slug, category")
        .eq("is_published", true)
        .eq("blog_type", "article")
        .order("published_at", { ascending: false })
        .limit(6);
      if (data) setBlogs(data);
    })();
  }, []);

  if (blogs.length === 0) return null;

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="mx-auto flex items-center justify-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary w-fit mb-4">
            <Sparkles className="h-4 w-4" />
            Latest AI Insights & News
          </div>
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">Stay Updated with AI</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Expert articles, trending tools, and career guides to keep you ahead in the AI revolution.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {blogs.map((blog) => (
            <Link
              key={blog.id}
              to={`/ai-blogs/${blog.slug || blog.id}`}
              className="group overflow-hidden rounded-xl border border-border bg-card transition-all hover:shadow-lg hover:border-primary/30"
            >
              <div className="aspect-video overflow-hidden" style={{ minHeight: "200px" }}>
                <img
                  src={blog.image_url || "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop"}
                  alt={blog.title}
                  width={600}
                  height={400}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="p-5">
                <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{blog.category}</span>
                <h3 className="mt-3 text-lg font-semibold text-foreground line-clamp-2">{blog.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{blog.excerpt}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(blog.published_at), "MMM dd, yyyy")}
                  </span>
                  <span className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Read More <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link to="/ai-blogs" className="cta-3d primary">
            View All Articles <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HomeBlogSection;
