import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Menu, X, Search } from "lucide-react";
import logo from "@/assets/logo.png";
import { useState, useMemo } from "react";
import MarqueeBar from "@/components/MarqueeBar";

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
}

interface DashboardLayoutProps {
  children: ReactNode;
  navItems: NavItem[];
  title: string;
  marqueeSegment?: "learner" | "coach";
}

const DashboardLayout = ({ children, navItems, title, marqueeSegment }: DashboardLayoutProps) => {
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredNavItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return navItems;
    return navItems.filter((item) => item.label.toLowerCase().includes(q));
  }, [navItems, search]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-border/40 glass-surface transition-transform duration-300 ease-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shrink-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ boxShadow: '8px 0 32px rgba(0,0,0,0.45)' }}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/30 px-5">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src={logo} alt="AI Coach Portal" className="h-8 w-8 rounded-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3" />
            <span className="text-sm font-bold text-foreground tracking-tight">{title}</span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="relative mb-3 px-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search menu..."
              className="w-full rounded-xl border border-border/40 bg-secondary/50 py-2 pl-9 pr-8 text-[13px] text-foreground placeholder:text-muted-foreground/70 focus:border-primary/40 focus:bg-secondary/80 focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            {filteredNavItems.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">No matches found</p>
            ) : (
              filteredNavItems.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
                      active
                        ? "bg-primary/10 text-primary nav-active-glow"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground hover:translate-x-0.5"
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary shadow-[0_0_10px_hsl(72_100%_50%/0.6)]" />
                    )}
                    <span className={active ? "icon-glow" : "opacity-70 group-hover:opacity-100 transition-opacity"}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })
            )}
          </div>
        </nav>

        <div className="shrink-0 border-t border-border/30 p-3">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-muted-foreground transition-all duration-200 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/30 glass-surface px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground transition-colors">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">{navItems.find(i => i.path === location.pathname)?.label || title}</h1>
        </header>
        {marqueeSegment && <MarqueeBar segment={marqueeSegment} position="header" />}
        <main className="flex-1 overflow-auto p-6 lg:p-8">
          <div className="mx-auto max-w-[1400px] space-y-8">
            {children}
          </div>
        </main>
        {marqueeSegment && <MarqueeBar segment={marqueeSegment} position="footer" />}
      </div>
    </div>
  );
};

export default DashboardLayout;
