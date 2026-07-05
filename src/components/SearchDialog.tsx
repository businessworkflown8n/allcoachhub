import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Mic, MicOff, BookOpen, GraduationCap, Users, FileText, Sparkles, Loader2, AlertCircle } from "lucide-react";
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
import { trackEvent, trackSearch, trackSearchResultClick } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type SearchKind = "course" | "coach" | "blog" | "workshop" | "category" | "job" | "faq";

type SearchItem = {
  id: string;
  title: string;
  subtitle?: string;
  kind: SearchKind;
  path: string;
  thumbnail?: string | null;
  keywords?: string[];
};

// ---------- device / browser detection ----------
const detectDevice = () => {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/(Android)/i.test(ua) && !/Mobile/i.test(ua))) return "tablet";
  if (/Mobi|iPhone|iPod|Android.*Mobile/i.test(ua)) return "mobile";
  return "desktop";
};

// ---------- fuzzy / intent scoring ----------
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

// Intent / synonym map — expand user query into related terms
const INTENT_MAP: Record<string, string[]> = {
  ai: ["ai", "artificial intelligence", "gen ai", "generative ai", "machine learning", "ml", "automation"],
  "artificial intelligence": ["ai", "gen ai", "machine learning"],
  chatgpt: ["chatgpt", "chat gpt", "prompt engineering", "openai", "gpt", "llm"],
  "prompt engineering": ["prompt engineering", "chatgpt", "gpt", "llm"],
  automation: ["automation", "ai automation", "workflow", "n8n", "make", "zapier"],
  "machine learning": ["machine learning", "ml", "ai", "deep learning"],
  business: ["business", "entrepreneur", "startup", "growth"],
  marketing: ["marketing", "digital marketing", "seo", "social media", "ads"],
  "digital marketing": ["digital marketing", "seo", "marketing", "ads"],
  python: ["python", "programming", "coding"],
};

// Common speech-to-text mis-spellings → canonical
const SPELLING_FIXES: Array<[RegExp, string]> = [
  [/\bprom(pt)?\s*en?gine+r?(ing)?\b/gi, "prompt engineering"],
  [/\bmachin(e)?\s*larn(ing)?\b/gi, "machine learning"],
  [/\bchat\s*gpt\b/gi, "chatgpt"],
  [/\bgen\s*ai\b/gi, "gen ai"],
  [/\ba\s*i\b/gi, "ai"],
];

const stripFillers = (s: string) =>
  s
    .replace(/\b(dikhao|dikha|dikhha|batao|chahiye|seekhna hai|seekhna|karo|find|show me|show|please|kaha|kahan|where can i learn|i want to learn|i need|how to use|best|for beginners|course|courses)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const applySpellingFixes = (s: string) => SPELLING_FIXES.reduce((acc, [re, rep]) => acc.replace(re, rep), s);

const expandIntent = (q: string): string[] => {
  const nq = norm(q);
  const out = new Set<string>([nq]);
  for (const [key, syns] of Object.entries(INTENT_MAP)) {
    if (nq.includes(key)) syns.forEach((s) => out.add(s));
  }
  return [...out];
};

const scoreMatch = (q: string, text: string) => {
  const nq = norm(q);
  const nt = norm(text);
  if (!nq || !nt) return 0;
  if (nt.includes(nq)) return 1 - (nt.indexOf(nq) / (nt.length + 1)) * 0.2;
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
    if (best >= 0.55) hits += best;
  }
  return hits / Math.max(qTokens.length, 1);
};

const scoreItem = (queries: string[], it: SearchItem) => {
  const haystacks = [it.title, it.subtitle || "", (it.keywords || []).join(" ")];
  let best = 0;
  for (const q of queries) {
    for (let i = 0; i < haystacks.length; i++) {
      const weight = i === 0 ? 1 : i === 1 ? 0.75 : 0.6;
      best = Math.max(best, scoreMatch(q, haystacks[i]) * weight);
    }
  }
  return best;
};

type VoiceState = "idle" | "listening" | "processing" | "success" | "error" | "denied";

const SearchDialog = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceLang, setVoiceLang] = useState<"en-US" | "hi-IN">("en-US");
  const [voiceSupported, setVoiceSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const device = useRef(detectDevice());
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Check voice support
  useEffect(() => {
    const SR: any = (typeof window !== "undefined") && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    setVoiceSupported(!!SR);
  }, []);

  // Keyboard: Cmd/Ctrl+K opens; Cmd/Ctrl+Shift+Space activates voice; ESC handled by dialog
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.code === "Space" && e.shiftKey && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => startVoice(), 150);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch index when opened
  useEffect(() => {
    if (!open || items.length) return;
    (async () => {
      const [courses, coaches, blogs, workshops, categories] = await Promise.all([
        supabase.from("courses").select("id, title, category, slug, thumbnail_url, tags").eq("is_published", true).eq("approval_status", "approved").limit(200),
        supabase.from("coach_public_profiles" as any).select("id, full_name, expertise, avatar_url, slug, category, tags").limit(200),
        supabase.from("ai_blogs").select("id, title, category, slug, tags").eq("is_published", true).limit(100),
        supabase.from("workshops").select("id, title, slug").limit(50),
        supabase.from("coach_categories").select("id, name, slug").limit(50),
      ]);

      const idx: SearchItem[] = [];
      (courses.data || []).forEach((c: any) => idx.push({
        id: `c-${c.id}`, title: c.title, subtitle: c.category, kind: "course",
        path: `/course/${c.slug || c.id}`, thumbnail: c.thumbnail_url, keywords: c.tags || [],
      }));
      (coaches.data || []).forEach((c: any) => idx.push({
        id: `p-${c.id}`, title: c.full_name,
        subtitle: Array.isArray(c.expertise) ? c.expertise.join(", ") : c.expertise || c.category,
        kind: "coach", path: `/coach-website/${c.slug || c.id}`, thumbnail: c.avatar_url,
        keywords: [...(c.tags || []), c.category].filter(Boolean),
      }));
      (blogs.data || []).forEach((b: any) => idx.push({
        id: `b-${b.id}`, title: b.title, subtitle: b.category, kind: "blog",
        path: `/ai-blogs/${b.slug || b.id}`, keywords: b.tags || [],
      }));
      (workshops.data || []).forEach((w: any) => idx.push({
        id: `w-${w.id}`, title: w.title, kind: "workshop", path: `/webinars`,
      }));
      (categories.data || []).forEach((c: any) => idx.push({
        id: `cat-${c.id}`, title: c.name, kind: "category", path: `/category/${c.slug || c.id}`,
      }));
      setItems(idx);
    })();
  }, [open, items.length]);

  const processedQuery = useMemo(() => applySpellingFixes(stripFillers(searchTerm)), [searchTerm]);
  const queryVariants = useMemo(() => expandIntent(processedQuery), [processedQuery]);

  const ranked = useMemo(() => {
    if (!processedQuery) return { high: [] as SearchItem[], suggestions: [] as SearchItem[] };
    const scored = items
      .map((it) => ({ it, s: scoreItem(queryVariants, it) }))
      .filter((x) => x.s > 0.35)
      .sort((a, b) => b.s - a.s);
    const high = scored.filter((x) => x.s >= 0.6).slice(0, 25).map((x) => x.it);
    const suggestions = scored.slice(0, 6).map((x) => x.it);
    return { high, suggestions };
  }, [items, processedQuery, queryVariants]);

  const grouped = useMemo(() => {
    const groups: Record<SearchKind, SearchItem[]> = {
      course: [], coach: [], blog: [], workshop: [], category: [], job: [], faq: [],
    };
    ranked.high.forEach((i) => groups[i.kind].push(i));
    return groups;
  }, [ranked]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (value.length >= 3) trackSearch(value, ranked.high.length, "command_dialog");
  };

  const handleSubmitSearch = () => {
    if (ranked.high.length > 0) {
      handleSelect(ranked.high[0], 0);
    }
  };

  const handleSelect = (item: SearchItem, index: number) => {
    trackSearchResultClick(searchTerm, item.title, index);
    trackEvent("voice_search_result_click", { query: searchTerm, kind: item.kind });
    navigate(item.path);
    setOpen(false);
    setSearchTerm("");
    setVoiceState("idle");
  };

  // ---------- Voice recognition ----------
  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      window.clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  const armSilenceTimer = () => {
    clearSilenceTimer();
    silenceTimerRef.current = window.setTimeout(() => {
      try { recognitionRef.current?.stop(); } catch {}
    }, 5000);
  };

  const startVoice = () => {
    setVoiceError(null);
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setVoiceSupported(false);
      setVoiceState("error");
      setVoiceError("Voice search isn't supported on this browser. Try Chrome, Edge, or Safari.");
      trackEvent("voice_search_unsupported", { device: device.current });
      return;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    trackEvent("voice_search_started", { device: device.current, lang: voiceLang });
    if ("vibrate" in navigator) { try { (navigator as any).vibrate?.(30); } catch {} }

    const rec = new SR();
    rec.lang = voiceLang;
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 3;
    rec.onstart = () => { setVoiceState("listening"); armSilenceTimer(); trackEvent("voice_permission_granted", { device: device.current }); };
    rec.onend = () => {
      clearSilenceTimer();
      setVoiceState((s) => (s === "listening" ? "processing" : s));
      setTimeout(() => setVoiceState((s) => (s === "processing" ? "success" : s)), 400);
      trackEvent("voice_search_completed", { device: device.current, query: searchTerm });
    };
    rec.onerror = (e: any) => {
      clearSilenceTimer();
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
        setVoiceState("denied");
        setVoiceError("Microphone permission denied. Please allow microphone access.");
        trackEvent("voice_permission_denied", { device: device.current });
      } else if (e?.error === "no-speech") {
        setVoiceState("error");
        setVoiceError("Didn't catch that. Try again.");
      } else {
        setVoiceState("error");
        setVoiceError("Voice error. Try again.");
      }
    };
    rec.onresult = (e: any) => {
      armSilenceTimer();
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0]?.transcript || "";
        else interim += r[0]?.transcript || "";
      }
      const text = (final || interim).trim();
      if (text) setSearchTerm(text);
    };
    recognitionRef.current = rec;
    try { rec.start(); } catch {}
  };

  const stopVoice = () => {
    clearSilenceTimer();
    try { recognitionRef.current?.stop(); } catch {}
    setVoiceState("idle");
  };

  const kindMeta: Record<SearchKind, { label: string }> = {
    course: { label: "📚 Courses" },
    coach: { label: "👨‍🏫 Coaches" },
    workshop: { label: "🎓 Workshops" },
    blog: { label: "📝 Blogs" },
    category: { label: "🗂 Categories" },
    job: { label: "💼 AI Jobs" },
    faq: { label: "❓ FAQs" },
  };

  const hasResults = ranked.high.length > 0;
  const listening = voiceState === "listening";

  const stateLabel: Record<VoiceState, string> = {
    idle: "🎤 Tap to speak",
    listening: "🔴 Listening…",
    processing: "⏳ Understanding…",
    success: "✅ Showing results",
    error: "⚠️ Couldn't understand",
    denied: "🎤 Please allow microphone access",
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary min-h-11"
        aria-label="Search — press Cmd or Ctrl plus K, or Cmd/Ctrl+Shift+Space for voice"
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
          <div className="absolute right-12 top-1/2 -translate-y-1/2 flex items-center gap-1">
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
              disabled={!voiceSupported}
              className={cn(
                "relative inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                listening ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary",
                !voiceSupported && "opacity-50 cursor-not-allowed"
              )}
              aria-label={listening ? "Stop voice search" : "Start voice search (Cmd/Ctrl+Shift+Space)"}
              title={listening ? "Stop (Esc)" : "Voice search"}
            >
              {voiceState === "processing" ? <Loader2 className="h-5 w-5 animate-spin" /> :
                listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              {listening && (
                <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-primary/40" />
              )}
            </button>
            {searchTerm && !listening && voiceState !== "processing" && (
              <button
                type="button"
                onClick={handleSubmitSearch}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label="Search"
                title="Search"
              >
                <Search className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {(listening || voiceState === "processing") && (
          <div className="flex items-center gap-1 px-4 py-2 border-b border-border" role="status" aria-live="polite">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <span
                key={i}
                className="inline-block w-1 rounded-full bg-primary animate-pulse"
                style={{ height: `${8 + ((i * 5) % 16)}px`, animationDelay: `${i * 100}ms` }}
              />
            ))}
            <span className="ml-2 text-xs text-muted-foreground">{stateLabel[voiceState]}</span>
          </div>
        )}
        {voiceError && (
          <div className="flex items-center gap-2 px-4 py-2 text-xs text-destructive border-b border-border" role="alert">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{voiceError}</span>
          </div>
        )}
        {!voiceSupported && (
          <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border">
            Voice search isn't supported in your browser. Use text search below.
          </div>
        )}

        <CommandList>
          {!searchTerm && (
            <CommandGroup heading="Try saying">
              {["Show me AI Automation courses", "ChatGPT seekhna hai", "Prompt Engineering", "Digital Marketing Coach", "Courses by Amlesh", "Python course"].map((s) => (
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
              <CommandGroup heading="Popular searches">
                {["AI Automation", "Prompt Engineering", "ChatGPT", "Digital Marketing", "Python"].map((s) => (
                  <CommandItem key={s} onSelect={() => setSearchTerm(s)}>
                    <Search className="mr-2 h-4 w-4" />{s}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {hasResults && (Object.keys(grouped) as SearchKind[]).map((kind) => {
            const list = grouped[kind];
            if (!list.length) return null;
            const Icon = kind === "course" ? BookOpen : kind === "coach" ? Users : kind === "workshop" ? GraduationCap : kind === "blog" ? FileText : Sparkles;
            return (
              <CommandGroup key={kind} heading={kindMeta[kind].label}>
                {list.map((it, idx) => (
                  <CommandItem key={it.id} onSelect={() => handleSelect(it, idx)}>
                    {it.thumbnail ? (
                      <img src={it.thumbnail} alt="" loading="lazy" className="mr-2 h-8 w-14 rounded object-cover" />
                    ) : (
                      <Icon className="mr-2 h-4 w-4" />
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
