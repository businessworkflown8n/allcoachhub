import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { useTranslation } from "@/i18n/TranslationProvider";
import { trackSearch, trackSearchResultClick } from "@/lib/analytics";

const SearchDialog = () => {
  const [open, setOpen] = useState(false);
  const [courses, setCourses] = useState<{ id: string; title: string; category: string }[]>([]);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    if (!open) return;
    const fetchCourses = async () => {
      const { data } = await supabase
        .from("courses")
        .select("id, title, category, slug, thumbnail_url")
        .eq("is_published", true)
        .eq("approval_status", "approved")
        .limit(50);
      setCourses(data || []);
    };
    fetchCourses();
  }, [open]);

  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (value.length >= 3) {
      trackSearch(value, courses.filter(c => c.title.toLowerCase().includes(value.toLowerCase())).length, "command_dialog");
    }
  };

  const handleCourseSelect = (course: any, index: number) => {
    trackSearchResultClick(searchTerm, course.title, index);
    navigate(`/course/${course.slug || course.id}`);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary"
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">{t("search.placeholder")}</span>
        <kbd className="pointer-events-none hidden select-none rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={t("search.inputPlaceholder")} value={searchTerm} onValueChange={handleSearchChange} />
        <CommandList>
          <CommandEmpty>{t("search.noResults")}</CommandEmpty>
          <CommandGroup heading={t("search.courses")}>
            {courses.map((course, idx) => (
              <CommandItem
                key={course.id}
                onSelect={() => handleCourseSelect(course, idx)}
              >
                {(course as any).thumbnail_url ? (
                  <img
                    src={(course as any).thumbnail_url}
                    alt=""
                    loading="lazy"
                    className="mr-2 h-8 w-14 rounded object-cover"
                  />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                <div>
                  <p>{course.title}</p>
                  <p className="text-xs text-muted-foreground">{course.category}</p>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading={t("search.quickLinks")}>
            <CommandItem onSelect={() => { navigate("/ai-blogs"); setOpen(false); }}>
              {t("nav.aiBlogs")}
            </CommandItem>
            <CommandItem onSelect={() => { navigate("/auth?mode=login"); setOpen(false); }}>
              {t("nav.signIn")}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
};

export default SearchDialog;
