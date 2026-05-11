import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, X, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HeaderMenuItem {
  label: string;
  href: string; // can be #anchor or external/internal URL
}

export interface HeaderConfig {
  menu_items?: HeaderMenuItem[];
  cta_label?: string;
  cta_href?: string;
  social_links?: Record<string, string>;
  whatsapp_number?: string;
  sticky?: boolean;
  transparent?: boolean;
  show_login?: boolean;
}

interface Props {
  logoUrl?: string;
  instituteName: string;
  themeColor: string;
  config: HeaderConfig;
  homeHref: string;
}

const defaultMenu: HeaderMenuItem[] = [
  { label: "Home", href: "#top" },
  { label: "About", href: "#cw-about" },
  { label: "Courses", href: "#cw-courses" },
  { label: "Testimonials", href: "#cw-testimonials" },
  { label: "FAQ", href: "#cw-faq" },
  { label: "Contact", href: "#cw-demo" },
];

const CoachWebsiteHeader = ({ logoUrl, instituteName, themeColor, config, homeHref }: Props) => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const items = config.menu_items?.length ? config.menu_items : defaultMenu;
  const sticky = config.sticky !== false;
  const transparent = !!config.transparent;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNav = (href: string) => {
    setOpen(false);
    if (href.startsWith("#")) {
      const id = href.slice(1);
      if (id === "top") return window.scrollTo({ top: 0, behavior: "smooth" });
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const headerBg = transparent && !scrolled
    ? "bg-transparent border-transparent"
    : "bg-background/85 backdrop-blur-xl border-border/60";

  return (
    <header
      className={cn(
        "z-50 w-full border-b transition-all duration-300",
        sticky ? "sticky top-0" : "relative",
        headerBg
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:h-20">
        <Link to={homeHref} className="flex items-center gap-2.5 min-w-0">
          {logoUrl ? (
            <img src={logoUrl} alt={instituteName} className="h-9 w-9 rounded-lg object-cover md:h-10 md:w-10" />
          ) : (
            <div
              className="h-9 w-9 rounded-lg md:h-10 md:w-10 flex items-center justify-center font-bold text-background"
              style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)` }}
            >
              {instituteName.charAt(0)}
            </div>
          )}
          <span className="truncate text-base font-bold text-foreground md:text-lg">{instituteName}</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-6">
          {items.map((it) => (
            <button
              key={it.label}
              onClick={() => handleNav(it.href)}
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
            >
              {it.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {config.whatsapp_number && (
            <a
              href={`https://wa.me/${config.whatsapp_number.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-full text-background transition-transform hover:scale-110"
              style={{ background: "#25D366" }}
              aria-label="Chat on WhatsApp"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          )}
          <Button
            size="sm"
            className="hidden md:inline-flex font-semibold"
            style={{ backgroundColor: themeColor, color: "#0B0F1A" }}
            onClick={() => handleNav(config.cta_href || "#cw-demo")}
          >
            {config.cta_label || "Get Started"}
          </Button>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-md text-foreground hover:bg-muted">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[85%] sm:w-[360px]">
              <div className="flex flex-col gap-1 mt-8">
                {items.map((it) => (
                  <button
                    key={it.label}
                    onClick={() => handleNav(it.href)}
                    className="text-left rounded-lg px-3 py-3 text-base font-medium text-foreground hover:bg-muted"
                  >
                    {it.label}
                  </button>
                ))}
                <Button
                  className="mt-4 font-semibold"
                  style={{ backgroundColor: themeColor, color: "#0B0F1A" }}
                  onClick={() => handleNav(config.cta_href || "#cw-demo")}
                >
                  {config.cta_label || "Get Started"}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default CoachWebsiteHeader;
