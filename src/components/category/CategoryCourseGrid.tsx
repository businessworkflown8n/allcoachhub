import { Link } from "react-router-dom";
import { Clock, Users, TrendingUp, Sparkles } from "lucide-react";
import { trackEvent } from "@/lib/analytics";

interface Props {
  courses: any[];
  coaches: Record<string, any>;
  enrollCounts: Record<string, number>;
  loading: boolean;
  symbol: string;
  priceKey: string;
  originalPriceKey: string;
  categoryName: string;
  trendingCourses: any[];
  isOthers?: boolean;
}

const isNewCourse = (createdAt: string) => {
  const diff = Date.now() - new Date(createdAt).getTime();
  return diff < 7 * 24 * 60 * 60 * 1000; // 7 days
};

const CategoryCourseGrid = ({
  courses, coaches, enrollCounts, loading,
  symbol, priceKey, originalPriceKey, categoryName, trendingCourses, isOthers,
}: Props) => {
  const trendingIds = new Set(trendingCourses.filter((c) => (enrollCounts[c.id] || 0) > 0).map((c) => c.id));

  return (
    <section className="container mx-auto px-4 py-12">
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : courses.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg text-muted-foreground">No courses available yet. Be the first coach to create one!</p>
          <Link to="/auth?mode=signup" className="mt-4 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110">
            + Create Course
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {courses.map((course) => {
            const price = Number(course[priceKey] || course.price_usd);
            const originalPrice = Number(course[originalPriceKey] || course.original_price_usd || 0);
            const coach = coaches[course.coach_id];
            const enrollCount = enrollCounts[course.id] || 0;
            const isNew = isNewCourse(course.created_at);
            const isTrending = trendingIds.has(course.id);

            return (
              <Link
                to={`/course/${course.slug || course.id}`}
                key={course.id}
                onClick={() => trackEvent("course_click", { course: course.title, coach: coach?.full_name, category: categoryName })}
                className="group relative flex flex-col rounded-xl border border-border bg-card transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
              >
                {/* Badges */}
                <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
                  {isNew && (
                    <span className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-accent-foreground backdrop-blur-sm">
                      <Sparkles className="h-3 w-3" /> NEW
                    </span>
                  )}
                  {isTrending && (
                    <span className="flex items-center gap-1 rounded-full bg-primary/90 px-2.5 py-0.5 text-[10px] font-bold text-primary-foreground backdrop-blur-sm">
                      <TrendingUp className="h-3 w-3" /> TRENDING
                    </span>
                  )}
                </div>

                {/* Thumbnail */}
                {course.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt={course.title} className="h-44 w-full rounded-t-xl object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-44 items-center justify-center rounded-t-xl bg-secondary text-4xl">🎓</div>
                )}

                <div className="flex flex-1 flex-col p-5">
                  {/* Tags */}
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">{course.level}</span>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">{course.language}</span>
                    {Number(course.discount_percent) > 0 && (
                      <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">
                        {Number(course.discount_percent)}% OFF
                      </span>
                    )}
                    {isOthers && (
                      <span className="rounded-full bg-accent/50 px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                        {course.category}
                      </span>
                    )}
                  </div>

                  <h2 className="mb-2 text-sm font-bold leading-snug text-foreground line-clamp-2">{course.title}</h2>

                  {/* Coach Attribution */}
                  {coach && (
                    <div className="mb-3 flex items-center gap-2">
                      {coach.avatar_url ? (
                        <img src={coach.avatar_url} alt={coach.full_name} className="h-5 w-5 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                          {coach.full_name?.[0] || "C"}
                        </div>
                      )}
                      <span
                        className="text-xs text-muted-foreground hover:text-primary"
                        onClick={(e) => {
                          if (coach.slug) {
                            e.preventDefault();
                            window.location.href = `/coach-profile/${coach.slug}`;
                          }
                        }}
                      >
                        by {coach.full_name}
                      </span>
                    </div>
                  )}

                  {/* Meta */}
                  <div className="mt-auto space-y-3">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {Number(course.duration_hours)}h</span>
                      {enrollCount > 0 && (
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {enrollCount} enrolled</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-border pt-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-foreground">{price === 0 ? "Free" : `${symbol}${price}`}</span>
                        {originalPrice > price && (
                          <span className="text-sm text-muted-foreground line-through">{symbol}{originalPrice}</span>
                        )}
                      </div>
                      <span className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-all group-hover:brightness-110">
                        Enroll
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default CategoryCourseGrid;
