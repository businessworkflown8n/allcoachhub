import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, GraduationCap } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";

interface Props {
  courses: any[];
  themeColor: string;
}

const CoachWebsiteCourses = ({ courses, themeColor }: Props) => {
  const { symbol, priceKey } = useCurrency();
  if (!courses.length) return null;

  return (
    <section id="cw-courses" className="border-b border-border py-14">
      <div className="container mx-auto px-4">
        <h2 className="mb-2 text-center text-2xl font-bold text-foreground">
          <GraduationCap className="mr-2 inline h-6 w-6" style={{ color: themeColor }} />
          Our Courses
        </h2>
        <p className="mx-auto mb-10 max-w-xl text-center text-sm text-muted-foreground">
          Explore our expert-led programs designed for real-world success
        </p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card key={course.id} className="flex flex-col overflow-hidden transition-shadow hover:shadow-lg">
              {course.thumbnail_url && (
                <div className="relative aspect-video w-full overflow-hidden bg-secondary">
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    width={1280}
                    height={720}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  />
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="line-clamp-2 text-lg">{course.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {course.duration_hours}h
                    </span>
                    <Badge variant="outline" className="text-xs">{course.level}</Badge>
                    <Badge variant="outline" className="text-xs">{course.category}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold" style={{ color: themeColor }}>
                      {symbol}{course[priceKey]}
                    </p>
                    {course.original_price_usd && course.discount_percent > 0 && (
                      <span className="text-sm text-muted-foreground line-through">
                        {symbol}{course[priceKey === "price_usd" ? "original_price_usd" : "original_price_inr"]}
                      </span>
                    )}
                  </div>
                </div>
                <Link to={`/course/${course.slug}`}>
                  <Button className="w-full" style={{ backgroundColor: themeColor }}>View & Enroll</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CoachWebsiteCourses;
