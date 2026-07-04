import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Mic, MicOff, BookOpen, GraduationCap, Users, FileText, Sparkles } from "lucide-react";
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
import { cn } from "@/lib/utils";

type SearchItem = {
  id: string;
  title: string;
  subtitle?: string;
  kind: "course" | "coach" | "blog" | "workshop" | "category";
  path: string;
  thumbnail?: string | null;
};

// --- lightweight fuzzy scoring (handles typos, partials, mispronunciation) ---
const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const levenshtein = (a: string, b: string) => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : Math.min(prev, dp[j], dp[j - 1]) + 1;
      prev = tmp;
    }
  }
  return dp[b.length];
};

const scoreMatch = (q: string, text: string) => {
  const nq = norm(q);
  const nt = norm(text);
  if (!nq || !nt) return 0;
  if (nt.includes(nq)) return 1 - (nt.indexOf(nq) / (nt.length + 1)) * 0.2;
  // token-level fuzzy
  const qTokens = nq.split(" ");
  const tTokens = nt.split(" ");
  let hits = 0;
  for (const qt of qTokens) {
    let best = 0;
    for (const tt of tTokens) {
      if (tt.includes(qt) || qt.includes(tt)) { best = Math.max(best, 0.85); continue; }
      const d = levenshtein(qt, tt);
      const sim = 1 - d / Math.max(qt.length, tt.length);
      if (sim > best) best = sim;
    }
    if (best >= 0.6) hits += best;
  }
  return hits / qTokens.length;
};

// Basic Hinglish/Hindi normalization (voice queries)
const stripFillers = (s: string) =>
  s
    .replace(/\b(dikhao|dikha|batao|chahiye|seekhna hai|seekhna|karo|find|show me|show|please|kaha|kahan|where can i learn|i want to learn|best|for beginners|course|courses)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const SearchDialog = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceLang, setVoiceLang] = useState<"en-US" | "hi-IN">("en-US");
  const recognitionRef = useRef<any>(null);
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

  // Fetch a broad index when opened
  useEffect(() => {
    if (!open || items.length) return;
    (async () => {
      const [courses, coaches, blogs, workshops] = await Promise.all([
        supabase
          .from("courses")
          .select("id, title, category, slug, thumbnail_url")
          .eq("is_published", true)
          .eq("approval_status", "approved")
          .limit(100),
        supabase
          .from("coach_public_profiles" as any)
          .select("id, full_name, expertise, avatar_url, slug")
          .limit(100),
        supabase
          .from("ai_blogs")
          .select("id, title, category, slug")
          .eq("is_published", true)
          .limit(100),
        supabase
          .from("workshops")
          .select("id, title, slug")
          .limit(50),
      ]);

      const idx: SearchItem[] = [];
      (courses.data || []).forEach((c: any) =>
        idx.push({
          id: `c-${c.id}`,
          title: c.title,
          subtitle: c.category,
          kind: "course",
          path: `/course/${c.slug || c.id}`,
          thumbnail: c.thumbnail_url,
        })
      );
      (coaches.data || []).forEach((c: any) =>
        idx.push({
          id: `p-${c.id}`,
          title: c.full_name,
          subtitle: Array.isArray(c.expertise) ? c.expertise.join(", ") : c.expertise,
          kind: "coach",
          path: `/coach-website/${c.slug || c.id}`,
          thumbnail: c.avatar_url,
        })
      );
      (blogs.data || []).forEach((b: any) =>
        idx.push({
          id: `b-${b.id}`,
          title: b.title,
          subtitle: b.category,
          kind: "blog",
          path: `/ai-blogs/${b.slug || b.id}`,
        })
      );
      (workshops.data || []).forEach((w: any) =>
        idx.push({
          id: `w-${w.id}`,
          title: w.title,
          kind: "workshop",
          path: `/webinars`,
        })
      );
      setItems(idx);
    })();
  }, [open, items.length]);

  const cleanedQuery = useMemo(() => stripFillers(searchTerm), [searchTerm]);

  const ranked = useMemo(() => {
    if (!cleanedQuery) return { high: [], suggestions: [] as SearchItem[] };
    const scored = items
      .map((it) => ({ it, s: Math.max(scoreMatch(cleanedQuery, it.title), scoreMatch(cleanedQuery, it.subtitle || "") * 0.7) }))
      .filter((x) => x.s > 0.35)
      .sort((a, b) => b.s - a.s);
    const high = scored.filter((x) => x.s >= 0.6).slice(0, 20).map((x) => x.it);
    const suggestions = scored.slice(0, 6).map((x) => x.it);
    return { high, suggestions };
  }, [items, cleanedQuery]);

  const grouped = useMemo(() => {
    const groups: Record<SearchItem["kind"], SearchItem[]> = {
      course: [], coach: [], blog: [], workshop: [], category: [],
    };
    ranked.high.forEach((i) => groups[i.kind].push(i));
    return groups;
  }, [ranked]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (value.length >= 3) trackSearch(value, ranked.high.length, "command_dialog");
  };

  const handleSelect = (item: SearchItem, index: number) => {
    trackSearchResultClick(searchTerm, item.title, index);
    navigate(item.path);
    setOpen(false);
    setSearchTerm("");
  };

  // --- Voice recognition ---
  const startVoice = () => {
    setVoiceError(null);
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setVoiceError("Voice search isn't supported on this browser. Try Chrome or Edge.");
      return;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    const rec = new SR();
    rec.lang = voiceLang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 3;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = (e: any) => {
      setListening(false);
      setVoiceError(e?.error === "not-allowed" ? "Microphone permission denied." : "Could not hear you. Try again.");
    };
    rec.onresult = (e: any) => {
      const last = e.results[e.results.length - 1];
      const transcript = last[0]?.transcript || "";
      setSearchTerm(transcript);
      if (last.isFinal) setListening(false);
    };
    recognitionRef.current = rec;
    try { rec.start(); } catch {}
  };

  const stopVoice = () => {
    try { recognitionRef.current?.stop(); } catch {}
    setListening(false);
  };

  const kindMeta: Record<SearchItem["kind"], { label: string; icon: any }> = {
    course: { label: "📚 Courses", icon: BookOpen },
    coach: { label: "👨‍🏫 Coaches", icon: Users },
    workshop: { label: "🎓 Workshops", icon: GraduationCap },
    blog: { label: "📝 Blogs", icon: FileText },
    category: { label: "🗂 Categories", icon: Sparkles },
  };

  const hasResults = ranked.high.length > 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary"
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">{t("search.placeholder")}</span>
        <Mic className="h-4 w-4 text-primary" aria-hidden="true" />
        <kbd className="pointer-events-none hidden select-none rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) stopVoice(); }}>
        <div className="relative">
          <CommandInput
            placeholder={listening ? "🎤 Listening… speak your question" : t("search.inputPlaceholder")}
            value={searchTerm}
            onValueChange={handleSearchChange}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <select
              value={voiceLang}
              onChange={(e) => setVoiceLang(e.target.value as any)}
              className="rounded bg-transparent text-xs text-muted-foreground focus:outline-none"
              aria-label="Voice language"
            >
              <option value="en-US">EN</option>
              <option value="hi-IN">हिं</option>
            </select>
            <button
              type="button"
              onClick={listening ? stopVoice : startVoice}
              className={cn(
                "relative inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                listening ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary"
              )}
              aria-label={listening ? "Stop voice search" : "Start voice search"}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {listening && (
                <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-primary/40" />
              )}
            </button>
          </div>
        </div>

        {listening && (
          <div className="flex items-center gap-1 px-4 py-2 border-b border-border">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="inline-block w-1 rounded-full bg-primary animate-pulse"
                style={{ height: `${8 + ((i * 5) % 14)}px`, animationDelay: `${i * 120}ms` }}
              />
            ))}
            <span className="ml-2 text-xs text-muted-foreground">Listening… speak now</span>
          </div>
        )}
        {voiceError && (
          <div className="px-4 py-2 text-xs text-destructive border-b border-border">{voiceError}</div>
        )}

        <CommandList>
          {!searchTerm && (
            <CommandGroup heading="Try saying">
              {["Show me AI Automation courses", "ChatGPT seekhna hai", "Prompt Engineering", "Courses by Amlesh"].map((s) => (
                <CommandItem key={s} onSelect={() => setSearchTerm(s)}>
                  <Mic className="mr-2 h-4 w-4 text-primary" />
                  {s}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {searchTerm && !hasResults && (
            <>
              <CommandEmpty>
                We couldn't find an exact match for "{searchTerm}".
              </CommandEmpty>
              {ranked.suggestions.length > 0 && (
                <CommandGroup heading="Did you mean?">
                  {ranked.suggestions.map((it, idx) => (
                    <CommandItem key={it.id} onSelect={() => handleSelect(it, idx)}>
                      <Sparkles className="mr-2 h-4 w-4 text-primary" />
                      <div>
                        <p>{it.title}</p>
                        {it.subtitle && <p className="text-xs text-muted-foreground">{it.subtitle}</p>}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}

          {hasResults && (Object.keys(grouped) as Array<SearchItem["kind"]>).map((kind) => {
            const list = grouped[kind];
            if (!list.length) return null;
            return (
              <CommandGroup key={kind} heading={kindMeta[kind].label}>
                {list.map((it, idx) => (
                  <CommandItem key={it.id} onSelect={() => handleSelect(it, idx)}>
                    {it.thumbnail ? (
                      <img src={it.thumbnail} alt="" loading="lazy" className="mr-2 h-8 w-14 rounded object-cover" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    <div>
                      <p>{it.title}</p>
                      {it.subtitle && <p className="text-xs text-muted-foreground">{it.subtitle}</p>}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}

          <CommandGroup heading={t("search.quickLinks")}>
            <CommandItem onSelect={() => { navigate("/browse-coaches"); setOpen(false); }}>Browse Coaches</CommandItem>
            <CommandItem onSelect={() => { navigate("/courses"); setOpen(false); }}>All Courses</CommandItem>
            <CommandItem onSelect={() => { navigate("/ai-blogs"); setOpen(false); }}>{t("nav.aiBlogs")}</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
};

export default SearchDialog;
