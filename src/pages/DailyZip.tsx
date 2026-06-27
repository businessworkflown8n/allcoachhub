import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Clock, Zap, RotateCcw, Undo2, Lightbulb, ChevronLeft, ChevronRight, Share2, Users, Globe, TrendingUp, Calendar, Maximize, Minimize, LogIn, Copy, Link, Keyboard, Mouse } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { generatePuzzle, generateDailyPuzzle, getDifficulty, getGridSize, type PuzzleData, type Cell } from "@/lib/puzzleGenerator";

const MAX_LEVEL = 1000;

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "bg-green-500/20 text-green-400 border-green-500/30",
  Medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Hard: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Expert: "bg-red-500/20 text-red-400 border-red-500/30",
  Daily: "bg-primary/20 text-primary border-primary/30",
};

const PATH_COLOR = "hsl(142, 60%, 45%)";
const PATH_COLOR_COMPLETE = "hsl(142, 70%, 50%)";
const PATH_WIDTH_RATIO = 0.55; // ratio of cell size

const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

const DailyZip = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [currentLevel, setCurrentLevel] = useState(1);
  const [tab, setTab] = useState<"game" | "daily" | "leaderboard">("game");
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null); // null = auto from level, 5/6/8 = override
  const [userPath, setUserPath] = useState<Cell[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const hasAutoFullscreened = useRef(false);

  // Fullscreen helpers
  const enterFullscreen = useCallback(() => {
    const el = gameContainerRef.current;
    if (!el) return;
    if (el.requestFullscreen) el.requestFullscreen();
    else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.exitFullscreen) document.exitFullscreen();
    else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) exitFullscreen();
    else enterFullscreen();
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement || !!(document as any).webkitFullscreenElement);
    };
    document.addEventListener("fullscreenchange", handler);
    document.addEventListener("webkitfullscreenchange", handler);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      document.removeEventListener("webkitfullscreenchange", handler);
    };
  }, []);

  // DB state
  const [progress, setProgress] = useState<{ current_level: number; total_score: number; total_games_played: number } | null>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [communityStats, setCommunityStats] = useState({ totalPlayers: 0, totalSolved: 0, highestLevel: 0 });
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<"all" | "weekly" | "monthly">("all");

  const puzzle = useMemo<PuzzleData>(() => {
    if (tab === "daily") return generateDailyPuzzle();
    return generatePuzzle(currentLevel, selectedDifficulty || undefined);
  }, [currentLevel, tab, selectedDifficulty]);

  // Load progress
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("daily_zip_progress").select("*").eq("user_id", user.id).maybeSingle();
      if (data) {
        setProgress(data as any);
        setCurrentLevel((data as any).current_level || 1);
      }
    };
    load();
  }, [user]);

  // Load leaderboard
  useEffect(() => {
    const load = async () => {
      const { data: lb } = await (supabase as any).rpc("get_daily_zip_leaderboard", { _limit: 20 });
      setLeaderboard(
        (lb || []).map((r: any) => ({
          user_id: r.user_id,
          current_level: r.current_level,
          total_games_played: r.total_games_played,
          profiles: { full_name: r.full_name, country: r.country },
        }))
      );
      const { data: stats } = await (supabase as any).rpc("get_daily_zip_community_stats");
      const s = Array.isArray(stats) ? stats[0] : null;
      if (s) {
        setCommunityStats({
          totalPlayers: Number(s.total_players) || 0,
          totalSolved: Number(s.total_solved) || 0,
          highestLevel: Number(s.highest_level) || 1,
        });
      }
    };
    load();
  }, []);

  // Timer
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRunning]);

  useEffect(() => { resetGame(); }, [currentLevel, tab]);

  const resetGame = () => {
    setUserPath([]);
    setIsCompleted(false);
    setTimer(0);
    setIsRunning(false);
    setHintsUsed(0);
    hasAutoFullscreened.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const getWaypointAt = (row: number, col: number) =>
    puzzle.waypoints.find(w => w.row === row && w.col === col);

  const isAdjacent = (a: Cell, b: Cell) =>
    Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;

  const isInPath = (row: number, col: number) =>
    userPath.some(p => p.row === row && p.col === col);

  const getPathIndex = (row: number, col: number) =>
    userPath.findIndex(p => p.row === row && p.col === col);

  const checkCompletion = useCallback((path: Cell[]) => {
    if (path.length !== puzzle.totalCells) return false;
    const sortedWp = [...puzzle.waypoints].sort((a, b) => a.value - b.value);
    let lastIdx = -1;
    for (const wp of sortedWp) {
      const idx = path.findIndex(p => p.row === wp.row && p.col === wp.col);
      if (idx === -1 || idx <= lastIdx) return false;
      lastIdx = idx;
    }
    return true;
  }, [puzzle]);

  const handleCellInteraction = useCallback((row: number, col: number) => {
    if (isCompleted) return;

    setUserPath(prev => {
      if (prev.length === 0) {
        const wp = getWaypointAt(row, col);
        if (wp?.value === 1) {
          if (!isRunning) setIsRunning(true);
          return [{ row, col }];
        }
        return prev;
      }

      // Backtrack
      const existingIdx = prev.findIndex(p => p.row === row && p.col === col);
      if (existingIdx !== -1) {
        return prev.slice(0, existingIdx + 1);
      }

      const last = prev[prev.length - 1];
      if (Math.abs(last.row - row) + Math.abs(last.col - col) !== 1) return prev;

      // Check waypoint ordering
      const wp = getWaypointAt(row, col);
      if (wp) {
        const visitedWaypoints = puzzle.waypoints
          .filter(w => prev.some(p => p.row === w.row && p.col === w.col))
          .sort((a, b) => a.value - b.value);
        const nextExpected = visitedWaypoints.length > 0 ? visitedWaypoints[visitedWaypoints.length - 1].value + 1 : 2;
        if (wp.value !== nextExpected) return prev;
      }

      const newPath = [...prev, { row, col }];

      if (checkCompletion(newPath)) {
        setIsCompleted(true);
        setIsRunning(false);
        const score = Math.max(1000 - timer * 5 - hintsUsed * 50, 100);
        saveScore(score);
        toast.success("🎉 Level Complete!");
      }

      return newPath;
    });
  }, [isCompleted, puzzle, isRunning, timer, hintsUsed, checkCompletion]);

  // Resolve cell from pointer position
  const getCellFromPointer = useCallback((clientX: number, clientY: number): Cell | null => {
    if (!boardRef.current) return null;
    const rect = boardRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const cellW = rect.width / puzzle.gridSize;
    const cellH = rect.height / puzzle.gridSize;
    const col = Math.floor(x / cellW);
    const row = Math.floor(y / cellH);
    if (row < 0 || row >= puzzle.gridSize || col < 0 || col >= puzzle.gridSize) return null;
    return { row, col };
  }, [puzzle.gridSize]);

  const lastCellRef = useRef<string | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setIsDrawing(true);
    // Auto-enter fullscreen on first interaction
    if (!hasAutoFullscreened.current && gameContainerRef.current) {
      hasAutoFullscreened.current = true;
      enterFullscreen();
    }
    const cell = getCellFromPointer(e.clientX, e.clientY);
    if (cell) {
      lastCellRef.current = `${cell.row},${cell.col}`;
      handleCellInteraction(cell.row, cell.col);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const cell = getCellFromPointer(e.clientX, e.clientY);
    if (cell) {
      const key = `${cell.row},${cell.col}`;
      if (key !== lastCellRef.current) {
        lastCellRef.current = key;
        handleCellInteraction(cell.row, cell.col);
      }
    }
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    lastCellRef.current = null;
  };

  // Keyboard arrow key controls for desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isCompleted) return;
      const dirMap: Record<string, [number, number]> = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      };
      const dir = dirMap[e.key];
      if (!dir) return;
      e.preventDefault();

      if (userPath.length === 0) {
        // Start from waypoint 1
        const wp1 = puzzle.waypoints.find(w => w.value === 1);
        if (wp1) {
          handleCellInteraction(wp1.row, wp1.col);
        }
        return;
      }

      const head = userPath[userPath.length - 1];
      const newRow = head.row + dir[0];
      const newCol = head.col + dir[1];
      if (newRow >= 0 && newRow < puzzle.gridSize && newCol >= 0 && newCol < puzzle.gridSize) {
        handleCellInteraction(newRow, newCol);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [userPath, isCompleted, puzzle, handleCellInteraction]);

  const handleUndo = () => {
    if (userPath.length <= 1) return;
    setUserPath(userPath.slice(0, -1));
  };

  const handleHint = () => {
    if (isCompleted || !puzzle.path) return;
    if (userPath.length === 0) {
      setUserPath([puzzle.path[0]]);
      setIsRunning(true);
    } else {
      const lastCell = userPath[userPath.length - 1];
      const lastInSolution = puzzle.path.findIndex(p => p.row === lastCell.row && p.col === lastCell.col);
      if (lastInSolution !== -1 && lastInSolution + 1 < puzzle.path.length) {
        const nextCell = puzzle.path[lastInSolution + 1];
        const newPath = [...userPath, nextCell];
        setUserPath(newPath);
        if (checkCompletion(newPath)) {
          setIsCompleted(true);
          setIsRunning(false);
          saveScore(Math.max(100, 500 - timer * 5));
          toast.success("🎉 Level Complete!");
        }
      }
    }
    setHintsUsed(h => h + 1);
  };

  const saveScore = async (score: number) => {
    if (!user) return;
    if (tab !== "daily") {
      await supabase.from("daily_zip_level_scores").upsert({
        user_id: user.id, level_number: currentLevel, time_seconds: timer, score,
      }, { onConflict: "user_id,level_number" });
      const newLevel = Math.min(currentLevel + 1, MAX_LEVEL);
      const { data: existing } = await supabase.from("daily_zip_progress").select("*").eq("user_id", user.id).maybeSingle();
      if (existing) {
        await supabase.from("daily_zip_progress").update({
          current_level: Math.max((existing as any).current_level, newLevel),
          total_score: (existing as any).total_score + score,
          total_games_played: (existing as any).total_games_played + 1,
          best_time_seconds: (existing as any).best_time_seconds ? Math.min((existing as any).best_time_seconds, timer) : timer,
          updated_at: new Date().toISOString(),
        }).eq("user_id", user.id);
      } else {
        await supabase.from("daily_zip_progress").insert({
          user_id: user.id, current_level: newLevel, total_score: score, total_games_played: 1, best_time_seconds: timer,
        });
      }
      setProgress(prev => ({
        current_level: Math.max(prev?.current_level || 1, newLevel),
        total_score: (prev?.total_score || 0) + score,
        total_games_played: (prev?.total_games_played || 0) + 1,
      }));
    } else {
      await supabase.from("daily_zip_scores").upsert({
        user_id: user.id, puzzle_id: "daily-" + new Date().toISOString().split("T")[0], time_seconds: timer, score,
      } as any, { onConflict: "user_id,puzzle_id" as any });
    }
  };

  const goToNextLevel = () => {
    if (currentLevel < MAX_LEVEL) setCurrentLevel(currentLevel + 1);
  };

  const goToPrevLevel = () => {
    if (currentLevel > 1) setCurrentLevel(currentLevel - 1);
  };

  // Auto-advance to next level after completion (with delay)
  useEffect(() => {
    if (isCompleted && tab === "game" && currentLevel < MAX_LEVEL) {
      const timeout = setTimeout(() => {
        goToNextLevel();
      }, 2500);
      return () => clearTimeout(timeout);
    }
  }, [isCompleted, tab, currentLevel]);

  const shareResult = (platform: string) => {
    const levelText = tab === "daily" ? "today's Daily Challenge" : `Level ${currentLevel}`;
    const score = Math.max(tab === "daily" ? 500 : 1000 - timer * 5 - hintsUsed * 50, 100);
    const msg = `🧩 I just crushed ${levelText} on Daily Zip!\n⏱️ Time: ${formatTime(timer)} | 🏆 Score: ${score}\n\n🔥 I challenge you to beat my time! Can you crack it faster?\n\n👉 Play now: https://www.aicoachportal.com/daily-zip`;
    const encoded = encodeURIComponent(msg);
    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encoded}`,
      twitter: `https://twitter.com/intent/tweet?text=${encoded}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://www.aicoachportal.com/daily-zip")}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?quote=${encoded}&u=${encodeURIComponent("https://www.aicoachportal.com/daily-zip")}`,
    };
    window.open(urls[platform], "_blank");
  };

  const shareLink = "https://www.aicoachportal.com/daily-zip";

  const getChallengeMessage = () => {
    const levelText = tab === "daily" ? "the Daily Challenge" : `Level ${currentLevel}`;
    const diff = puzzle.difficulty;
    return `🎯 I dare you to try ${levelText} on Daily Zip!\n\n🧩 Difficulty: ${diff} (${gridSize}×${gridSize} grid)\n⚡ Think you can solve it fast?\n\n🔥 Challenge accepted? Play here:\n👉 ${shareLink}`;
  };

  const shareChallenge = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(getChallengeMessage())}`, "_blank");
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      toast.success("Link copied to clipboard!");
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };

  const copyChallenge = () => {
    navigator.clipboard.writeText(getChallengeMessage()).then(() => {
      toast.success("Challenge message copied!");
    }).catch(() => {
      toast.error("Failed to copy message");
    });
  };

  // SEO
  useEffect(() => {
    document.title = "Daily Zip – AI Puzzle Game | AI Coach Portal";
    const meta = document.querySelector('meta[name="description"]');
    const content = "Play Daily Zip, a grid puzzle game with 1000 levels. Connect numbers in order, fill every cell, and compete on the leaderboard!";
    if (meta) meta.setAttribute("content", content);
    else { const m = document.createElement("meta"); m.name = "description"; m.content = content; document.head.appendChild(m); }
  }, []);

  const gridSize = puzzle.gridSize;
  // Responsive cell sizing
  const cellSize = gridSize <= 5 ? 64 : gridSize <= 6 ? 58 : gridSize <= 7 ? 50 : 44;
  const gap = 3;
  const boardPx = gridSize * cellSize + (gridSize - 1) * gap;
  const pathW = cellSize * PATH_WIDTH_RATIO;

  // Build SVG path segments
  const buildPathSegments = () => {
    if (userPath.length < 2) return null;
    const color = isCompleted ? PATH_COLOR_COMPLETE : PATH_COLOR;
    const segments: React.ReactNode[] = [];

    for (let i = 0; i < userPath.length - 1; i++) {
      const a = userPath[i];
      const b = userPath[i + 1];
      const ax = a.col * (cellSize + gap) + cellSize / 2;
      const ay = a.row * (cellSize + gap) + cellSize / 2;
      const bx = b.col * (cellSize + gap) + cellSize / 2;
      const by = b.row * (cellSize + gap) + cellSize / 2;

      segments.push(
        <line
          key={`seg-${i}`}
          x1={ax} y1={ay} x2={bx} y2={by}
          stroke={color}
          strokeWidth={pathW}
          strokeLinecap="round"
        />
      );
    }

    // Draw filled circles at each path cell for a smooth thick path
    for (let i = 0; i < userPath.length; i++) {
      const c = userPath[i];
      const cx = c.col * (cellSize + gap) + cellSize / 2;
      const cy = c.row * (cellSize + gap) + cellSize / 2;
      segments.push(
        <circle
          key={`dot-${i}`}
          cx={cx} cy={cy} r={pathW / 2}
          fill={color}
        />
      );
    }

    return segments;
  };

  // Single filled cell for path start when only 1 cell
  const buildSingleDot = () => {
    if (userPath.length !== 1) return null;
    const c = userPath[0];
    const cx = c.col * (cellSize + gap) + cellSize / 2;
    const cy = c.row * (cellSize + gap) + cellSize / 2;
    const color = PATH_COLOR;
    return <circle cx={cx} cy={cy} r={pathW / 2} fill={color} />;
  };

  if (authLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-20 pb-16">
          <div className="flex items-center justify-center pt-32">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background pt-20 pb-16">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-md pt-16 text-center">
              <div className="mb-6 flex items-center justify-center gap-2">
                <Zap className="h-10 w-10 text-primary" />
                <h1 className="text-4xl font-bold text-foreground">Daily Zip</h1>
              </div>
              <p className="mb-2 text-muted-foreground">A grid puzzle game with 1000 levels</p>
              <p className="mb-8 text-sm text-muted-foreground">Connect the dots in order • Fill every cell • Compete on the leaderboard</p>
              <Card className="border-border/50 bg-card/80 backdrop-blur">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    <LogIn className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">Sign up to play Daily Zip</h2>
                  <p className="text-sm text-muted-foreground">Create a free account to start playing, track your progress, and compete on the leaderboard.</p>
                  <div className="flex flex-col gap-3">
                    <Button onClick={() => navigate("/auth?mode=signup")} className="w-full">
                      Sign Up Free
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/auth?mode=login")} className="w-full">
                      Already have an account? Log In
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-20 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mb-1 flex items-center justify-center gap-2">
              <Zap className="h-7 w-7 text-primary" />
              <h1 className="text-3xl font-bold text-foreground md:text-4xl">Daily Zip</h1>
            </div>
            <p className="text-sm text-muted-foreground">Connect the dots in order • Fill every cell</p>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mx-auto mb-4 max-w-md">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="game" className="gap-1"><Zap className="h-3.5 w-3.5" /> Levels</TabsTrigger>
              <TabsTrigger value="daily" className="gap-1"><Calendar className="h-3.5 w-3.5" /> Daily</TabsTrigger>
              <TabsTrigger value="leaderboard" className="gap-1"><Trophy className="h-3.5 w-3.5" /> Ranks</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Difficulty Selector */}
          {tab === "game" && (
            <div className="mx-auto mb-6 max-w-md">
              <p className="mb-2 text-center text-xs font-medium text-muted-foreground">Select Difficulty</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Auto", value: null, desc: "From Level", color: "border-border" },
                  { label: "Easy", value: 5, desc: "5×5 Grid", color: "border-green-500/50 bg-green-500/5" },
                  { label: "Medium", value: 6, desc: "6×6 Grid", color: "border-yellow-500/50 bg-yellow-500/5" },
                  { label: "Hard", value: 8, desc: "8×8 Grid", color: "border-red-500/50 bg-red-500/5" },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setSelectedDifficulty(opt.value)}
                    className={`rounded-lg border-2 p-2 text-center transition-all ${
                      selectedDifficulty === opt.value
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : opt.color + " hover:border-primary/40"
                    }`}
                  >
                    <p className="text-xs font-semibold text-foreground">{opt.label}</p>
                    <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "leaderboard" ? (
            <LeaderboardView leaderboard={leaderboard} communityStats={communityStats} userId={user?.id} period={leaderboardPeriod} setPeriod={setLeaderboardPeriod} />
          ) : (
            <div ref={gameContainerRef} className={`mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_300px] ${isFullscreen ? "bg-background p-4 overflow-auto" : ""}`}>
              <Card className="border-border/50 bg-card/80 backdrop-blur">
                <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 pb-3">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
                      {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                    </Button>
                    {tab === "game" && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={currentLevel <= 1} onClick={() => setCurrentLevel(currentLevel - 1)}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="min-w-[80px] text-center text-sm font-semibold text-foreground">
                          Level {currentLevel} / {MAX_LEVEL}
                        </span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={currentLevel >= (progress?.current_level || 1)} onClick={() => setCurrentLevel(currentLevel + 1)}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    {tab === "daily" && <span className="text-sm font-semibold text-foreground">Daily Challenge</span>}
                    <Badge variant="outline" className={DIFFICULTY_COLORS[puzzle.difficulty] || ""}>
                      {puzzle.difficulty} {gridSize}×{gridSize}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-sm">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {formatTime(timer)}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Game Board */}
                  <div className="flex justify-center">
                    <div
                      ref={boardRef}
                      className="relative select-none touch-none"
                      style={{ width: boardPx, height: boardPx }}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerCancel={handlePointerUp}
                      onContextMenu={e => e.preventDefault()}
                    >
                      {/* Grid background with clear lines */}
                      <div
                        className="absolute inset-0 rounded-lg"
                        style={{
                          background: "hsl(var(--muted) / 0.15)",
                          border: "2px solid hsl(var(--border))",
                        }}
                      />
                      {/* Horizontal grid lines */}
                      {Array.from({ length: gridSize - 1 }, (_, i) => {
                        const y = (i + 1) * (cellSize + gap) - gap / 2;
                        return (
                          <div
                            key={`h-line-${i}`}
                            className="absolute left-0 right-0"
                            style={{
                              top: y,
                              height: 2,
                              background: "hsl(var(--border))",
                              zIndex: 1,
                            }}
                          />
                        );
                      })}
                      {/* Vertical grid lines */}
                      {Array.from({ length: gridSize - 1 }, (_, i) => {
                        const x = (i + 1) * (cellSize + gap) - gap / 2;
                        return (
                          <div
                            key={`v-line-${i}`}
                            className="absolute top-0 bottom-0"
                            style={{
                              left: x,
                              width: 2,
                              background: "hsl(var(--border))",
                              zIndex: 1,
                            }}
                          />
                        );
                      })}
                      {/* Grid cells */}
                      {Array.from({ length: gridSize }, (_, row) =>
                        Array.from({ length: gridSize }, (_, col) => {
                          const x = col * (cellSize + gap);
                          const y = row * (cellSize + gap);

                          return (
                            <div
                              key={`${row}-${col}`}
                              className="absolute rounded-sm bg-muted/20"
                              style={{
                                left: x, top: y,
                                width: cellSize, height: cellSize,
                              }}
                            />
                          );
                        })
                      )}

                      {/* SVG path overlay */}
                      <svg
                        className="absolute inset-0 pointer-events-none"
                        width={boardPx}
                        height={boardPx}
                        style={{ zIndex: 10 }}
                      >
                        {buildPathSegments()}
                        {buildSingleDot()}
                      </svg>

                      {/* Waypoint dots (on top) */}
                      {puzzle.waypoints.map(wp => {
                        const cx = wp.col * (cellSize + gap) + cellSize / 2;
                        const cy = wp.row * (cellSize + gap) + cellSize / 2;
                        const dotSize = cellSize * 0.5;
                        const inPath = isInPath(wp.row, wp.col);

                        return (
                          <div
                            key={`wp-${wp.value}`}
                            className="absolute flex items-center justify-center rounded-full bg-foreground text-background font-bold pointer-events-none"
                            style={{
                              left: cx - dotSize / 2,
                              top: cy - dotSize / 2,
                              width: dotSize,
                              height: dotSize,
                              fontSize: dotSize * 0.52,
                              zIndex: 20,
                              boxShadow: inPath ? "0 0 0 3px hsl(142, 60%, 45%)" : "none",
                            }}
                          >
                            {wp.value}
                          </div>
                        );
                      })}

                      {/* Active head glow */}
                      {userPath.length > 0 && !isCompleted && (() => {
                        const head = userPath[userPath.length - 1];
                        const hx = head.col * (cellSize + gap) + cellSize / 2;
                        const hy = head.row * (cellSize + gap) + cellSize / 2;
                        const isWp = !!getWaypointAt(head.row, head.col);
                        if (isWp) return null;
                        return (
                          <div
                            className="absolute rounded-full pointer-events-none"
                            style={{
                              left: hx - pathW / 2 - 4,
                              top: hy - pathW / 2 - 4,
                              width: pathW + 8,
                              height: pathW + 8,
                              border: "2px solid hsl(142, 60%, 55%)",
                              boxShadow: "0 0 12px hsl(142, 60%, 45% / 0.5)",
                              zIndex: 15,
                            }}
                          />
                        );
                      })()}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="mt-5 flex items-center justify-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleUndo} disabled={userPath.length <= 1 || isCompleted}>
                      <Undo2 className="mr-1 h-3.5 w-3.5" /> Undo
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleHint} disabled={isCompleted}>
                      <Lightbulb className="mr-1 h-3.5 w-3.5" /> Hint
                    </Button>
                    <Button variant="outline" size="sm" onClick={resetGame}>
                      <RotateCcw className="mr-1 h-3.5 w-3.5" /> Restart
                    </Button>
                  </div>

                  {/* Previous / Next navigation */}
                  {tab === "game" && (
                    <div className="mt-4 flex items-center justify-between">
                      <Button
                        variant="outline"
                        onClick={goToPrevLevel}
                        disabled={currentLevel <= 1}
                        className="gap-1.5"
                      >
                        <ChevronLeft className="h-4 w-4" /> Previous
                      </Button>
                      <span className="text-sm font-medium text-muted-foreground">
                        Level {currentLevel} / {MAX_LEVEL}
                      </span>
                      <Button
                        variant="outline"
                        onClick={goToNextLevel}
                        disabled={currentLevel >= (progress?.current_level || 1)}
                        className="gap-1.5"
                      >
                        Next <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Progress */}
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{userPath.length} / {puzzle.totalCells} cells</span>
                    <span>{Math.round((userPath.length / puzzle.totalCells) * 100)}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all duration-200" style={{ width: `${(userPath.length / puzzle.totalCells) * 100}%` }} />
                  </div>

                  {/* How to play */}
                  <div className="mt-4 rounded-lg border border-border/40 bg-muted/20 p-3">
                    <p className="mb-2 text-xs font-semibold text-foreground">How to play</p>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex gap-0.5">
                          {[1,2,3].map(n => (
                            <span key={n} className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background text-[9px] font-bold">{n}</span>
                          ))}
                        </div>
                        <span className="text-[10px] text-muted-foreground">Connect dots in order</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="grid grid-cols-3 gap-px">
                          {Array.from({length: 9}).map((_, i) => (
                            <div key={i} className="h-[7px] w-[7px] rounded-[1px]" style={{ backgroundColor: i < 7 ? PATH_COLOR : "hsl(var(--muted))" }} />
                          ))}
                        </div>
                        <span className="text-[10px] text-muted-foreground">Fill every cell</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex gap-0.5 items-center">
                          <Mouse className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">/</span>
                          <Keyboard className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="text-[10px] text-muted-foreground">Drag or Arrow Keys</span>
                      </div>
                    </div>
                  </div>

                  {/* Completion */}
                  {isCompleted && (
                    <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-6 text-center animate-fade-in">
                      <Trophy className="mx-auto mb-2 h-10 w-10 text-primary" />
                      <h3 className="mb-1 text-xl font-bold text-foreground">
                        {tab === "daily" ? "Daily Challenge Complete!" : `Level ${currentLevel} Complete!`}
                      </h3>
                      <p className="text-sm text-muted-foreground">Time: {formatTime(timer)} • Hints: {hintsUsed}</p>
                      <p className="mb-4 text-lg font-semibold text-primary">
                        Score: {Math.max(tab === "daily" ? 500 : 1000 - timer * 5 - hintsUsed * 50, 100)}
                      </p>
                      {tab === "game" && currentLevel < MAX_LEVEL && (
                        <Button onClick={goToNextLevel} className="mb-3">
                          Next Level <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      )}
                      <div className="flex flex-wrap justify-center gap-2">
                        <Button size="sm" onClick={() => shareResult("whatsapp")} className="gap-1.5 bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,40%)]">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          WhatsApp
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => shareResult("twitter")}>𝕏 Twitter</Button>
                        <Button size="sm" variant="outline" onClick={() => shareResult("linkedin")}>LinkedIn</Button>
                        <Button size="sm" variant="outline" onClick={() => shareResult("facebook")}>Facebook</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sidebar */}
              <div className="space-y-4">
                {user && progress && (
                  <Card className="border-border/50 bg-card/80 backdrop-blur">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm"><TrendingUp className="h-4 w-4 text-primary" /> Your Progress</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3 text-center">
                      <div className="rounded-lg bg-muted/50 p-2"><p className="text-lg font-bold text-foreground">{progress.current_level}</p><p className="text-[10px] text-muted-foreground">Current Level</p></div>
                      <div className="rounded-lg bg-muted/50 p-2"><p className="text-lg font-bold text-foreground">{progress.total_score.toLocaleString()}</p><p className="text-[10px] text-muted-foreground">Total Score</p></div>
                      <div className="rounded-lg bg-muted/50 p-2"><p className="text-lg font-bold text-foreground">{progress.total_games_played}</p><p className="text-[10px] text-muted-foreground">Games Played</p></div>
                      <div className="rounded-lg bg-muted/50 p-2"><p className="text-lg font-bold text-foreground">{getDifficulty(progress.current_level)}</p><p className="text-[10px] text-muted-foreground">Difficulty</p></div>
                    </CardContent>
                  </Card>
                )}
                <Card className="border-border/50 bg-card/80 backdrop-blur">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm"><Globe className="h-4 w-4 text-primary" /> Community Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Total Players</span><span className="font-semibold text-foreground">{communityStats.totalPlayers}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Puzzles Solved</span><span className="font-semibold text-foreground">{communityStats.totalSolved}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Highest Level</span><span className="font-semibold text-foreground">{communityStats.highestLevel}</span></div>
                  </CardContent>
                </Card>
                {/* Challenge a Friend */}
                <Card className="border-[hsl(142,50%,40%)]/30 bg-[hsl(142,50%,40%)]/5 backdrop-blur">
                  <CardContent className="pt-5 pb-4 text-center space-y-3">
                    <div className="flex items-center justify-center gap-2">
                      <Share2 className="h-5 w-5 text-[hsl(142,60%,45%)]" />
                      <h3 className="text-sm font-bold text-foreground">Challenge a Friend</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Dare your friends to beat your time! Share the game link or send a challenge.
                    </p>
                    {/* Shareable Link */}
                    <div className="flex items-center gap-1.5 rounded-md border border-border bg-background/60 px-2 py-1.5">
                      <Link className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground truncate flex-1 text-left">aicoachportal.com/daily-zip</span>
                      <Button size="sm" variant="ghost" className="h-7 px-2 shrink-0" onClick={copyShareLink}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={shareChallenge}
                        size="sm"
                        className="gap-1.5 bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,40%)] text-white"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        WhatsApp
                      </Button>
                      <Button
                        onClick={copyChallenge}
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy Message
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

function LeaderboardView({ leaderboard, communityStats, userId, period, setPeriod }: {
  leaderboard: any[]; communityStats: { totalPlayers: number; totalSolved: number; highestLevel: number };
  userId?: string; period: string; setPeriod: (p: any) => void;
}) {
  const userRank = userId ? leaderboard.findIndex((l: any) => l.user_id === userId) + 1 : 0;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-border/50 bg-card/80 backdrop-blur text-center"><CardContent className="pt-6"><Users className="mx-auto mb-1 h-6 w-6 text-primary" /><p className="text-2xl font-bold text-foreground">{communityStats.totalPlayers}</p><p className="text-xs text-muted-foreground">Total Players</p></CardContent></Card>
        <Card className="border-border/50 bg-card/80 backdrop-blur text-center"><CardContent className="pt-6"><Zap className="mx-auto mb-1 h-6 w-6 text-primary" /><p className="text-2xl font-bold text-foreground">{communityStats.totalSolved}</p><p className="text-xs text-muted-foreground">Puzzles Solved</p></CardContent></Card>
        <Card className="border-border/50 bg-card/80 backdrop-blur text-center"><CardContent className="pt-6"><TrendingUp className="mx-auto mb-1 h-6 w-6 text-primary" /><p className="text-2xl font-bold text-foreground">{communityStats.highestLevel}</p><p className="text-xs text-muted-foreground">Highest Level</p></CardContent></Card>
      </div>
      {userRank > 0 && (
        <Card className="border-primary/30 bg-primary/5"><CardContent className="flex items-center justify-between py-4"><span className="text-sm font-medium text-foreground">Your Rank</span><Badge className="text-lg">#{userRank}</Badge></CardContent></Card>
      )}
      <Card className="border-border/50 bg-card/80 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /> Leaderboard</CardTitle>
            <Tabs value={period} onValueChange={setPeriod}><TabsList className="h-8"><TabsTrigger value="all" className="text-xs px-2 h-6">All Time</TabsTrigger><TabsTrigger value="weekly" className="text-xs px-2 h-6">Weekly</TabsTrigger><TabsTrigger value="monthly" className="text-xs px-2 h-6">Monthly</TabsTrigger></TabsList></Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {leaderboard.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No players yet. Be the first!</p>
          ) : (
            <div className="space-y-2">
              {leaderboard.map((entry: any, i: number) => (
                <div key={entry.id} className={`flex items-center justify-between rounded-lg border px-4 py-3 ${entry.user_id === userId ? "border-primary/30 bg-primary/5" : "border-border bg-background/50"}`}>
                  <div className="flex items-center gap-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${i === 0 ? "bg-yellow-500/20 text-yellow-500" : i === 1 ? "bg-gray-400/20 text-gray-400" : i === 2 ? "bg-orange-500/20 text-orange-500" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                    <div><p className="text-sm font-medium text-foreground">{(entry.profiles as any)?.full_name || "Anonymous"}</p><p className="text-[10px] text-muted-foreground">{(entry.profiles as any)?.country || "—"}</p></div>
                  </div>
                  <div className="text-right"><p className="text-sm font-semibold text-foreground">Level {entry.current_level}</p><p className="text-[10px] text-muted-foreground">Score: {entry.total_score?.toLocaleString()} • {entry.total_games_played} games</p></div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default DailyZip;
