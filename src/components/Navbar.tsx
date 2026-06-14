import { Menu, X, ChevronDown, ChevronRight } from "lucide-react";
import logoOptimized from "@/assets/logo-optimized.png";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useState, useRef, useEffect, lazy, Suspense } from "react";
import SearchDialog from "@/components/SearchDialog";
import LocationSelector from "@/components/LocationSelector";
import { useTranslation } from "@/i18n/TranslationProvider";
import MarqueeBar from "@/components/MarqueeBar";

const NotificationBell = lazy(() => import("@/components/NotificationBell"));

interface NavbarProps {
  customLogo?: string | null;
  customName?: string | null;
  customHomeLink?: string;
}

const Navbar = ({ customLogo, customName, customHomeLink }: NavbarProps = {}) => {
  const { user, signOut } = useAuth();
  const { role } = useUserRole();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [coursesOpen, setCoursesOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [mobileCoursesOpen, setMobileCoursesOpen] = useState(false);
  const [mobileDemoOpen, setMobileDemoOpen] = useState(false);
  const [blogMenuOpen, setBlogMenuOpen] = useState(false);
  const [mobileBlogOpen, setMobileBlogOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const blogTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const blogCategories = [
    { slug: "ai-trends", label: "AI Trends" },
    { slug: "ai-education", label: "AI in Education" },
    { slug: "ai-tools", label: "AI Tools" },
    { slug: "ai-fundamentals", label: "AI Fundamentals" },
    { slug: "ai-careers", label: "AI Careers" },
    { slug: "ai-research", label: "AI Research" },
    { slug: "ai-policy", label: "AI Policy" },
    { slug: "weekly-ai-news", label: "Weekly Update" },
  ];

  const dashboardPath = role === "admin" ? "/admin" : role === "coach" ? "/coach" : "/learner";

  const handleSectionClick = (hash: string) => {
    if (location.pathname !== "/") {
      navigate("/" + hash);
    } else {
      const el = document.querySelector(hash);
      el?.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCoursesOpen(false);
        setDemoOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleDropdownEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setCoursesOpen(true);
  };

  const handleDropdownLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setCoursesOpen(false);
      setDemoOpen(false);
    }, 150);
  };

  return (
    <>
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to={customHomeLink || "/"} className="flex items-center gap-2">
          <img src={customLogo || logoOptimized} alt={customName || "AI Coach Portal"} width={32} height={32} className="h-8 w-8 rounded-lg object-cover" />
          <span className="text-lg font-bold text-foreground">{customName || "AI Coach Portal"}</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link to="/browse-coaches" className="text-sm text-muted-foreground transition-colors hover:text-primary">{t("nav.browseCoaches")}</Link>
          
          <div
            ref={dropdownRef}
            className="relative"
            onMouseEnter={handleDropdownEnter}
            onMouseLeave={handleDropdownLeave}
          >
            <button
              className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
              onClick={() => { setCoursesOpen(!coursesOpen); navigate("/courses"); }}
            >
              {t("nav.courses")}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${coursesOpen ? "rotate-180" : ""}`} />
            </button>

            {coursesOpen && (
              <div className="absolute left-0 top-full mt-2 w-48 rounded-lg border border-border bg-popover p-1 shadow-lg">
                <Link
                  to="/courses"
                  className="block rounded-md px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  onClick={() => { setCoursesOpen(false); }}
                >
                  Regular Classes
                </Link>
                <Link
                  to="/courses/ai-kids-pro"
                  className="block rounded-md px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  onClick={() => { setCoursesOpen(false); }}
                >
                  <span className="mr-1">🚀</span> AI Kids Pro
                </Link>
                <div
                  className="relative"
                  onMouseEnter={() => setDemoOpen(true)}
                  onMouseLeave={() => setDemoOpen(false)}
                >
                  <button
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={() => setDemoOpen(!demoOpen)}
                  >
                    Demo Classes
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>

                  {demoOpen && (
                    <div className="absolute left-full top-0 ml-1 w-44 rounded-lg border border-border bg-popover p-1 shadow-lg">
                      <Link
                        to="/webinars"
                        className="block rounded-md px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        onClick={() => { setCoursesOpen(false); setDemoOpen(false); }}
                      >
                        Webinars
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button onClick={() => handleSectionClick("#how-it-works")} className="text-sm text-muted-foreground transition-colors hover:text-primary">{t("nav.howItWorks")}</button>
          
          <div
            className="relative"
            onMouseEnter={() => { if (blogTimeoutRef.current) clearTimeout(blogTimeoutRef.current); setBlogMenuOpen(true); }}
            onMouseLeave={() => { blogTimeoutRef.current = setTimeout(() => setBlogMenuOpen(false), 150); }}
          >
            <Link
              to="/ai-blogs"
              className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              AI Jobs & News
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${blogMenuOpen ? "rotate-180" : ""}`} />
            </Link>
            {blogMenuOpen && (
              <div className="absolute left-0 top-full mt-2 w-48 rounded-lg border border-border bg-popover p-1 shadow-lg">
                {blogCategories.map((cat) => (
                  <Link
                    key={cat.slug}
                    to={`/ai-jobs-news/${cat.slug}`}
                    className="block rounded-md px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={() => setBlogMenuOpen(false)}
                  >
                    {cat.label}
                  </Link>
                ))}
                <div className="my-1 border-t border-border" />
                <Link
                  to="/materials"
                  className="block rounded-md px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  onClick={() => setBlogMenuOpen(false)}
                >
                  📚 Materials
                </Link>
                <Link
                  to="/prompt-generator"
                  className="block rounded-md px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  onClick={() => setBlogMenuOpen(false)}
                >
                  ✨ Prompt Generator
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LocationSelector />
          <SearchDialog />
          {user && role === "learner" && (
            <Suspense fallback={null}>
              <NotificationBell />
            </Suspense>
          )}
          {user ? (
            <>
              <Link to={dashboardPath} className="hidden text-sm text-muted-foreground transition-colors hover:text-primary md:block">
                {t("nav.dashboard")}
              </Link>
              <button
                onClick={signOut}
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                {t("nav.signOut")}
              </button>
            </>
          ) : (
            <>
              <Link to="/auth?mode=login" className="text-sm text-muted-foreground transition-colors hover:text-primary">
                {t("nav.signIn")}
              </Link>
              <Link
                to="/auth?mode=signup"
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                {t("nav.getStarted")}
              </Link>
            </>
          )}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-muted-foreground min-h-11 min-w-11 inline-flex items-center justify-center"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border bg-background px-4 pb-4 md:hidden">
          <div className="flex flex-col gap-1 pt-3">
            <Link to="/browse-coaches" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent">{t("nav.browseCoaches")}</Link>
            
            <div>
              <button
                onClick={() => setMobileCoursesOpen(!mobileCoursesOpen)}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
              >
                {t("nav.courses")}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${mobileCoursesOpen ? "rotate-180" : ""}`} />
              </button>
              {mobileCoursesOpen && (
                <div className="ml-3 flex flex-col gap-1 border-l border-border pl-3">
                  <Link to="/courses" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                    Regular Classes
                  </Link>
                  <Link to="/courses/ai-kids-pro" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                    🚀 AI Kids Pro
                  </Link>
                  <div>
                    <button
                      onClick={() => setMobileDemoOpen(!mobileDemoOpen)}
                      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                      Demo Classes
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${mobileDemoOpen ? "rotate-180" : ""}`} />
                    </button>
                    {mobileDemoOpen && (
                      <div className="ml-3 flex flex-col gap-1 border-l border-border pl-3">
                        <Link to="/webinars" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                          Webinars
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => { setMobileOpen(false); handleSectionClick("#how-it-works"); }} className="rounded-md px-3 py-2 text-sm text-muted-foreground text-left hover:bg-accent">{t("nav.howItWorks")}</button>
            
            <div>
              <button
                onClick={() => setMobileBlogOpen(!mobileBlogOpen)}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
              >
                AI Jobs & News
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${mobileBlogOpen ? "rotate-180" : ""}`} />
              </button>
              {mobileBlogOpen && (
                <div className="ml-3 flex flex-col gap-1 border-l border-border pl-3">
                  <Link to="/ai-blogs" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                    All Articles
                  </Link>
                  {blogCategories.map((cat) => (
                    <Link
                      key={cat.slug}
                      to={`/ai-jobs-news/${cat.slug}`}
                      onClick={() => setMobileOpen(false)}
                      className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                      {cat.label}
                    </Link>
                  ))}
                  <Link to="/materials" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                    📚 Materials
                  </Link>
                  <Link to="/prompt-generator" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground">
                    ✨ Prompt Generator
                  </Link>
                </div>
              )}
            </div>
            {user && (
              <Link to={dashboardPath} onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent">{t("nav.dashboard")}</Link>
            )}
          </div>
        </div>
      )}
      <MarqueeBar segment="website" position="header" />
    </nav>
    </>
  );
};

export default Navbar;
