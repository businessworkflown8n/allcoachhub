import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCoachCategories } from "@/hooks/useCoachCategories";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, Search, Download, Eye, BookOpen, DollarSign, Users, Ban, CheckCircle, Trash2, Tag, Mail, X, ArrowUpDown, Filter, Video, Activity, Clock, TrendingUp, Star, AlertTriangle, ChevronLeft, ChevronRight, Trophy, ArrowUp, ArrowDown, IndianRupee, BarChart3 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

const TAG_OPTIONS = ["High Revenue", "Top Coach", "New Coach", "Inactive", "Featured", "VIP"];
const PAGE_SIZE = 15;
const SYNC_INTERVAL = 20000;

const AdminCoaches = () => {
  const { user } = useAuth();
  const { categories: coachCategories } = useCoachCategories(false);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [webinars, setWebinars] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCoach, setSelectedCoach] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("last_active");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [enrollSearch, setEnrollSearch] = useState("");
  const [enrollPaymentFilter, setEnrollPaymentFilter] = useState<string>("all");
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [isLive, setIsLive] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [performanceCoach, setPerformanceCoach] = useState<any>(null);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [webinarCommissions, setWebinarCommissions] = useState<any[]>([]);
  const [defaultCommission, setDefaultCommission] = useState(20);
  const [defaultWebinarCommission, setDefaultWebinarCommission] = useState(1);
  const [webinarRegs, setWebinarRegs] = useState<any[]>([]);
  const [coachPaymentStatuses, setCoachPaymentStatuses] = useState<Record<string, string>>({});
  const [updatingCoachPayment, setUpdatingCoachPayment] = useState<string | null>(null);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "coach");
      if (!roles || roles.length === 0) {
        setCoaches([]); setCourses([]); setEnrollments([]); setPayments([]); setWebinars([]); setReviews([]);
        setLoading(false); setLastSyncTime(new Date()); return;
      }
      const ids = roles.map((r) => r.user_id);
      const [profiles, courseData, enrollData, payData, webinarData, reviewData, commData, webCommData, defComm, defWebComm, webRegData] = await Promise.all([
        supabase.from("profiles").select("*").in("user_id", ids),
        supabase.from("courses").select("*").in("coach_id", ids),
        supabase.from("enrollments").select("*, courses(price_usd, price_inr)").in("coach_id", ids),
        supabase.from("payments").select("*").in("coach_id", ids),
        supabase.from("webinars").select("*").in("coach_id", ids),
        supabase.from("reviews").select("*").in("coach_id", ids),
        supabase.from("coach_commissions").select("*"),
        supabase.from("coach_webinar_commissions").select("*"),
        supabase.from("platform_settings").select("value").eq("key", "commission_percent").single(),
        supabase.from("platform_settings").select("value").eq("key", "webinar_commission_percent").single(),
        supabase.from("webinar_registrations").select("*"),
      ]);
      setCoaches(profiles.data || []);
      setCourses(courseData.data || []);
      setEnrollments(enrollData.data || []);
      setPayments(payData.data || []);
      setWebinars(webinarData.data || []);
      setReviews(reviewData.data || []);
      setCommissions(commData.data || []);
      setWebinarCommissions(webCommData.data || []);
      setWebinarRegs(webRegData.data || []);
      if (defComm.data) setDefaultCommission(Number(defComm.data.value) || 20);
      if (defWebComm.data) setDefaultWebinarCommission(Number(defWebComm.data.value) || 1);
      setLastSyncTime(new Date());
    } catch (err) {
      console.error("Sync error:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => fetchAll(true), SYNC_INTERVAL);
    return () => clearInterval(interval);
  }, [isLive, fetchAll]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-coaches-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchAll(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "courses" }, () => fetchAll(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "enrollments" }, () => fetchAll(true))
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () => fetchAll(true))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

  const getCoachStats = useCallback((userId: string) => {
    const coachCourses = courses.filter((c) => c.coach_id === userId);
    const coachEnrollments = enrollments.filter((e) => e.coach_id === userId);
    const paidEnrollments = coachEnrollments.filter((e) => e.payment_status === "paid");
    const unpaidEnrollments = coachEnrollments.filter((e) => e.payment_status !== "paid");
    const revenue = paidEnrollments.reduce((s, e) => s + Number(e.amount_paid || 0), 0);
    const categories = [...new Set(coachCourses.map(c => c.category))];
    const coachWebinars = webinars.filter((w) => w.coach_id === userId);
    const coachReviews = reviews.filter((r) => r.coach_id === userId);
    const avgRating = coachReviews.length > 0 ? coachReviews.reduce((s, r) => s + r.rating, 0) / coachReviews.length : 0;
    const studentIds = [...new Set(coachEnrollments.map(e => e.learner_id))];
    return { courses: coachCourses.length, enrollments: coachEnrollments.length, revenue, categories, paidEnrollments: paidEnrollments.length, unpaidEnrollments: unpaidEnrollments.length, webinars: coachWebinars.length, avgRating, totalStudents: studentIds.length, reviewCount: coachReviews.length };
  }, [courses, enrollments, webinars, reviews]);

  const getCoachFinancials = useCallback((userId: string) => {
    const coachEnrolls = enrollments.filter((e) => e.coach_id === userId && e.payment_status === "paid");
    const coachComm = commissions.find(c => c.coach_id === userId);
    const coachWebComm = webinarCommissions.find(c => c.coach_id === userId);
    const courseCommPercent = coachComm?.commission_percent ?? defaultCommission;
    const webinarCommPercent = coachWebComm?.commission_percent ?? defaultWebinarCommission;

    let totalEarningsINR = 0;
    let courseCommINR = 0;
    let webinarCommINR = 0;

    coachEnrolls.forEach((e: any) => {
      const course = e.courses as any;
      const priceINR = Number(course?.price_inr || 0);
      totalEarningsINR += priceINR;
      courseCommINR += priceINR * (courseCommPercent / 100);
      webinarCommINR += priceINR * (webinarCommPercent / 100);
    });

    const totalDueINR = totalEarningsINR - courseCommINR - webinarCommINR;

    // Webinar registrations count
    const coachWebinarIds = webinars.filter(w => w.coach_id === userId).map(w => w.id);
    const webinarRegCount = webinarRegs.filter(r => coachWebinarIds.includes(r.webinar_id)).length;

    return { totalEarningsINR, courseCommINR, webinarCommINR, totalDueINR, courseCommPercent, webinarCommPercent, webinarRegCount };
  }, [enrollments, commissions, webinarCommissions, defaultCommission, defaultWebinarCommission, webinars, webinarRegs]);

  const changeCoachPaymentStatus = async (coachUserId: string, newStatus: string) => {
    setUpdatingCoachPayment(coachUserId);
    setCoachPaymentStatuses(prev => ({ ...prev, [coachUserId]: newStatus }));
    setUpdatingCoachPayment(null);
    toast({ title: `Payment status set to ${newStatus}` });
  };
  const getCourseStats = useCallback((courseId: string) => {
    const courseEnrollments = enrollments.filter((e) => e.course_id === courseId);
    const paid = courseEnrollments.filter((e) => e.payment_status === "paid");
    const unpaid = courseEnrollments.filter((e) => e.payment_status !== "paid");
    const revenue = paid.reduce((s, e) => s + Number(e.amount_paid || 0), 0);
    return { totalEnrollments: courseEnrollments.length, paidCount: paid.length, unpaidCount: unpaid.length, revenue };
  }, [enrollments]);

  const togglePublicListing = async (coach: any, newStatus: "active" | "hold") => {
    const { error } = await supabase.from("profiles").update({ public_listing_status: newStatus }).eq("user_id", coach.user_id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setCoaches(prev => prev.map(c => c.user_id === coach.user_id ? { ...c, public_listing_status: newStatus } : c));
    toast({ title: newStatus === "active" ? "Coach is now publicly listed" : "Coach put on hold (hidden from public)" });
  };

  const toggleSuspend = async (coach: any) => {
    const newStatus = !coach.is_suspended;
    const { error } = await supabase.from("profiles").update({ is_suspended: newStatus }).eq("user_id", coach.user_id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: newStatus ? "Coach suspended" : "Coach activated" });
    fetchAll();
  };

  const deleteCoach = async (coach: any) => {
    if (!confirm(`Delete coach "${coach.full_name}"? This cannot be undone.`)) return;
    const { error: roleErr } = await supabase.from("user_roles").delete().eq("user_id", coach.user_id);
    const { error: profErr } = await supabase.from("profiles").delete().eq("user_id", coach.user_id);
    if (roleErr || profErr) { toast({ title: "Error", description: (roleErr || profErr)?.message, variant: "destructive" }); return; }
    toast({ title: "Coach deleted" });
    fetchAll();
  };

  const updateTags = async (coach: any, tags: string[]) => {
    const { error } = await supabase.from("profiles").update({ tags }).eq("user_id", coach.user_id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setCoaches(prev => prev.map(c => c.user_id === coach.user_id ? { ...c, tags } : c));
    if (selectedCoach?.user_id === coach.user_id) setSelectedCoach({ ...coach, tags });
    toast({ title: "Tags updated" });
  };

  const changePaymentStatus = async (enrollment: any, newStatus: string) => {
    const oldStatus = enrollment.payment_status;
    if (oldStatus === newStatus) return;
    setUpdatingStatus(enrollment.id);
    const { error } = await supabase.from("enrollments").update({ payment_status: newStatus }).eq("id", enrollment.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setUpdatingStatus(null); return; }
    if (user) {
      await supabase.from("payment_status_audit").insert({ enrollment_id: enrollment.id, old_status: oldStatus, new_status: newStatus, changed_by: user.id });
    }
    setEnrollments(prev => prev.map(e => e.id === enrollment.id ? { ...e, payment_status: newStatus } : e));
    setUpdatingStatus(null);
    toast({ title: `Payment status changed to ${newStatus}` });
  };

  const countries = useMemo(() => [...new Set(coaches.map(c => c.country).filter(Boolean))].sort(), [coaches]);
  const cities = useMemo(() => [...new Set(coaches.map(c => c.city).filter(Boolean))].sort(), [coaches]);

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(prev => prev === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const filtered = useMemo(() => {
    let result = coaches.filter((c) => {
      const matchesSearch = !search || [c.full_name, c.email, c.category, c.country, c.city, c.company_name, c.contact_number].some((v) => v?.toLowerCase().includes(search.toLowerCase()));
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? !c.is_suspended : c.is_suspended);
      const matchesCountry = countryFilter === "all" || c.country === countryFilter;
      const matchesCity = cityFilter === "all" || c.city === cityFilter;
      const matchesCategory = categoryFilter === "all" || c.category_id === categoryFilter;
      return matchesSearch && matchesStatus && matchesCountry && matchesCity && matchesCategory;
    });
    result = [...result].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const sa = getCoachStats(a.user_id);
      const sb = getCoachStats(b.user_id);
      switch (sortField) {
        case "name": return dir * (a.full_name || "").localeCompare(b.full_name || "");
        case "email": return dir * (a.email || "").localeCompare(b.email || "");
        case "company": return dir * (a.company_name || "").localeCompare(b.company_name || "");
        case "country": return dir * (a.country || "").localeCompare(b.country || "");
        case "status": return dir * (Number(a.is_suspended) - Number(b.is_suspended));
        case "courses": return dir * (sa.courses - sb.courses);
        case "students": return dir * (sa.totalStudents - sb.totalStudents);
        case "rating": return dir * (sa.avgRating - sb.avgRating);
        case "revenue": return dir * (sa.revenue - sb.revenue);
        case "earnings": return dir * (getCoachFinancials(a.user_id).totalEarningsINR - getCoachFinancials(b.user_id).totalEarningsINR);
        case "due": return dir * (getCoachFinancials(a.user_id).totalDueINR - getCoachFinancials(b.user_id).totalDueINR);
        case "tags": return dir * ((a.tags || []).join(",")).localeCompare((b.tags || []).join(","));
        case "last_active": return dir * (new Date(a.last_active_at || 0).getTime() - new Date(b.last_active_at || 0).getTime());
        case "registered": return dir * (new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
        default: return 0;
      }
    });
    return result;
  }, [coaches, search, statusFilter, countryFilter, cityFilter, categoryFilter, sortField, sortDir, getCoachStats, getCoachFinancials]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedCoaches = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, countryFilter, cityFilter, sortField, sortDir]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(c => c.user_id)));
  };
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds); next.has(id) ? next.delete(id) : next.add(id); setSelectedIds(next);
  };

  const handleBulkEmail = () => {
    toast({ title: `Campaign triggered for ${selectedIds.size} coaches`, description: `Emails selected` });
    setSelectedIds(new Set());
  };

  const exportCSV = () => {
    const headers = ["Name", "Email", "Phone", "City", "Country", "Courses", "Webinars", "Learners", "Total Earnings (₹)", "Total Due (₹)", "Payment Status", "Tags", "Joined"];
    const rows = filtered.map((c) => {
      const s = getCoachStats(c.user_id);
      const f = getCoachFinancials(c.user_id);
      return [c.full_name, c.email, c.contact_number, c.city, c.country, s.courses, s.webinars, s.totalStudents, `₹${f.totalEarningsINR.toFixed(2)}`, `₹${f.totalDueINR.toFixed(2)}`, coachPaymentStatuses[c.user_id] || "pending", (c.tags || []).join(";"), new Date(c.created_at).toLocaleDateString()];
    });
    const csv = [headers, ...rows].map((r) => r.map(v => `"${v || ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "coaches_financial_report.csv"; a.click();
  };

  const exportEnrollmentsCSV = (coachEnrollments: any[]) => {
    const headers = ["Learner Name", "Email", "Phone", "Country", "Course Name", "Course Price", "Enrollment Date", "Paid Status", "Amount Paid", "Payment ID"];
    const rows = coachEnrollments.map((e) => {
      const course = courses.find(c => c.id === e.course_id);
      return [e.full_name, e.email, e.contact_number, e.country, course?.title || "—", `$${course?.price_usd || 0}`, new Date(e.enrolled_at).toLocaleDateString(), e.payment_status, `$${Number(e.amount_paid || 0).toFixed(2)}`, e.payment_id || ""];
    });
    const csv = [headers, ...rows].map((r) => r.map(v => `"${v || ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "coach_enrollments.csv"; a.click();
  };

  const clearFilters = () => { setSearch(""); setStatusFilter("all"); setCountryFilter("all"); setCityFilter("all"); setCategoryFilter("all"); setSortField("last_active"); setSortDir("desc"); };
  const hasFilters = search || statusFilter !== "all" || countryFilter !== "all" || cityFilter !== "all" || categoryFilter !== "all" || sortField !== "last_active";

  // Metrics
  const totalRevenue = useMemo(() => coaches.reduce((s, c) => s + getCoachStats(c.user_id).revenue, 0), [coaches, getCoachStats]);
  const totalEnrollments = useMemo(() => coaches.reduce((s, c) => s + getCoachStats(c.user_id).enrollments, 0), [coaches, getCoachStats]);
  const totalStudents = useMemo(() => {
    const allStudentIds = new Set<string>();
    enrollments.forEach(e => allStudentIds.add(e.learner_id));
    return allStudentIds.size;
  }, [enrollments]);
  const activeCoaches = coaches.filter(c => !c.is_suspended).length;
  const avgRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  }, [reviews]);

  // Top coach
  const topCoach = useMemo(() => {
    if (coaches.length === 0) return null;
    let best = coaches[0];
    let bestRevenue = 0;
    coaches.forEach(c => {
      const rev = getCoachStats(c.user_id).revenue;
      if (rev > bestRevenue) { best = c; bestRevenue = rev; }
    });
    return bestRevenue > 0 ? { ...best, revenue: bestRevenue } : null;
  }, [coaches, getCoachStats]);

  // Coach performance bar chart (top 10 by revenue)
  const coachPerformanceData = useMemo(() => {
    return coaches
      .map(c => ({ name: c.full_name?.split(" ")[0] || "—", revenue: getCoachStats(c.user_id).revenue, students: getCoachStats(c.user_id).totalStudents }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [coaches, getCoachStats]);

  // Revenue trend
  const revenueTrend = useMemo(() => {
    const monthMap: Record<string, number> = {};
    enrollments.filter(e => e.payment_status === "paid").forEach(e => {
      const d = new Date(e.enrolled_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap[key] = (monthMap[key] || 0) + Number(e.amount_paid || 0);
    });
    return Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b)).slice(-12)
      .map(([month, revenue]) => ({ month: new Date(month + "-01").toLocaleDateString("en-US", { month: "short", year: "2-digit" }), revenue }));
  }, [enrollments]);

  // Status distribution pie
  const statusPieData = useMemo(() => [
    { name: "Active", value: activeCoaches, fill: "hsl(142, 71%, 45%)" },
    { name: "Suspended", value: coaches.length - activeCoaches, fill: "hsl(0, 84%, 60%)" },
  ], [coaches, activeCoaches]);

  if (loading) return (
    <div className="space-y-5">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );

  // ─── Detail view ───
  if (selectedCoach) {
    const s = getCoachStats(selectedCoach.user_id);
    const coachCourses = courses.filter((c) => c.coach_id === selectedCoach.user_id);
    const coachEnrollments = enrollments.filter((e) => e.coach_id === selectedCoach.user_id);
    const coachTags: string[] = selectedCoach.tags || [];
    const filteredEnrollments = coachEnrollments.filter((e) => {
      const matchSearch = !enrollSearch || [e.full_name, e.email].some(v => v?.toLowerCase().includes(enrollSearch.toLowerCase()));
      const matchPayment = enrollPaymentFilter === "all" || e.payment_status === enrollPaymentFilter;
      return matchSearch && matchPayment;
    });

    return (
      <div className="space-y-6">
        <button onClick={() => { setSelectedCoach(null); setEnrollSearch(""); setEnrollPaymentFilter("all"); }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">← Back to Coaches</button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20 text-primary text-xl font-bold">{selectedCoach.full_name?.[0] || "C"}</div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{selectedCoach.full_name || "—"}</h2>
              <p className="text-sm text-muted-foreground">{selectedCoach.company_name && `${selectedCoach.company_name} • `}{selectedCoach.category} • {selectedCoach.country}</p>
              <div className="flex gap-1 mt-1 flex-wrap">
                {coachTags.map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                {s.avgRating > 0 && <Badge variant="outline" className="text-xs gap-1"><Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />{s.avgRating.toFixed(1)}</Badge>}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => toggleSuspend(selectedCoach)} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ${selectedCoach.is_suspended ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" : "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"}`}>
              {selectedCoach.is_suspended ? <><CheckCircle className="h-3.5 w-3.5" /> Activate</> : <><Ban className="h-3.5 w-3.5" /> Suspend</>}
            </button>
            <button onClick={() => deleteCoach(selectedCoach)} className="flex items-center gap-1.5 rounded-lg bg-destructive/20 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/30">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>

        {selectedCoach.is_suspended && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3"><p className="text-sm text-destructive font-medium">This coach is currently suspended</p></div>
        )}

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-7">
          <div className="rounded-xl border border-border bg-card p-4"><BookOpen className="h-5 w-5 text-primary mb-2" /><p className="text-2xl font-bold text-foreground">{s.courses}</p><p className="text-xs text-muted-foreground">Courses</p></div>
          <div className="rounded-xl border border-border bg-card p-4"><Video className="h-5 w-5 text-cyan-400 mb-2" /><p className="text-2xl font-bold text-foreground">{s.webinars}</p><p className="text-xs text-muted-foreground">Webinars</p></div>
          <div className="rounded-xl border border-border bg-card p-4"><Users className="h-5 w-5 text-blue-400 mb-2" /><p className="text-2xl font-bold text-foreground">{s.totalStudents}</p><p className="text-xs text-muted-foreground">Students</p></div>
          <div className="rounded-xl border border-border bg-card p-4"><CheckCircle className="h-5 w-5 text-green-400 mb-2" /><p className="text-2xl font-bold text-foreground">{s.paidEnrollments}</p><p className="text-xs text-muted-foreground">Paid</p></div>
          <div className="rounded-xl border border-border bg-card p-4"><X className="h-5 w-5 text-yellow-400 mb-2" /><p className="text-2xl font-bold text-foreground">{s.unpaidEnrollments}</p><p className="text-xs text-muted-foreground">Unpaid</p></div>
          <div className="rounded-xl border border-border bg-card p-4"><DollarSign className="h-5 w-5 text-green-400 mb-2" /><p className="text-2xl font-bold text-foreground">${s.revenue.toFixed(0)}</p><p className="text-xs text-muted-foreground">Revenue</p></div>
          <div className="rounded-xl border border-border bg-card p-4"><Star className="h-5 w-5 text-yellow-400 mb-2" /><p className="text-2xl font-bold text-foreground">{s.avgRating > 0 ? s.avgRating.toFixed(1) : "—"}</p><p className="text-xs text-muted-foreground">Avg Rating ({s.reviewCount})</p></div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Contact Information</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {[["Email", selectedCoach.email], ["Company", selectedCoach.company_name], ["Category", coachCategories.find(cat => cat.id === selectedCoach.category_id)?.name || selectedCoach.category || "—"], ["Phone", selectedCoach.contact_number], ["WhatsApp", selectedCoach.whatsapp_number], ["LinkedIn", selectedCoach.linkedin_profile], ["City", selectedCoach.city], ["Country", selectedCoach.country]].map(([label, val]) => (
                <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm text-foreground break-all">{val || "—"}</p></div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Profile & Marketing</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {[["Bio", selectedCoach.bio], ["Education", selectedCoach.education], ["Experience", selectedCoach.experience], ["Category", selectedCoach.category], ["Marketing Consent", selectedCoach.marketing_consent ? "Yes" : "No"], ["Registered", new Date(selectedCoach.created_at).toLocaleDateString()]].map(([label, val]) => (
                <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm text-foreground">{val || "—"}</p></div>
              ))}
            </div>
          </div>
        </div>

        {(selectedCoach.utm_source || selectedCoach.utm_medium || selectedCoach.utm_campaign) && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Signup Source (UTM)</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {[["Source", selectedCoach.utm_source], ["Medium", selectedCoach.utm_medium], ["Campaign", selectedCoach.utm_campaign]].map(([label, val]) => (
                <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm text-foreground">{val || "—"}</p></div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {TAG_OPTIONS.map(tag => {
              const active = coachTags.includes(tag);
              return (
                <button key={tag} onClick={() => updateTags(selectedCoach, active ? coachTags.filter(t => t !== tag) : [...coachTags, tag])}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${active ? "bg-primary/20 text-primary border-primary/40" : "bg-secondary text-muted-foreground border-border hover:border-primary/30"}`}>
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {coachCourses.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Course-wise Performance ({coachCourses.length})</h3>
            <div className="rounded-xl border border-border overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Course Name</TableHead><TableHead>Category</TableHead><TableHead>Level</TableHead><TableHead>Price</TableHead><TableHead>Enrollments</TableHead><TableHead>Paid</TableHead><TableHead>Unpaid</TableHead><TableHead>Revenue</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {coachCourses.map((c) => {
                    const cs = getCourseStats(c.id);
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="text-foreground font-medium">{c.title}</TableCell>
                        <TableCell className="text-muted-foreground">{c.category}</TableCell>
                        <TableCell className="text-muted-foreground">{c.level}</TableCell>
                        <TableCell className="text-foreground">${c.price_usd}</TableCell>
                        <TableCell className="text-foreground">{cs.totalEnrollments}</TableCell>
                        <TableCell className="text-green-400">{cs.paidCount}</TableCell>
                        <TableCell className="text-yellow-400">{cs.unpaidCount}</TableCell>
                        <TableCell className="text-green-400 font-medium">${cs.revenue.toFixed(2)}</TableCell>
                        <TableCell><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${c.approval_status === "approved" ? "bg-green-500/20 text-green-400" : c.approval_status === "rejected" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>{c.approval_status}</span></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {coachEnrollments.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold text-foreground">Enrollment Details ({coachEnrollments.length})</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input placeholder="Search learner..." value={enrollSearch} onChange={(e) => setEnrollSearch(e.target.value)} className="pl-9 bg-secondary border-border w-48 h-8 text-xs" />
                </div>
                <Select value={enrollPaymentFilter} onValueChange={setEnrollPaymentFilter}>
                  <SelectTrigger className="w-28 bg-secondary border-border h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="paid">Paid</SelectItem><SelectItem value="pending">Unpaid</SelectItem></SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={() => exportEnrollmentsCSV(filteredEnrollments)} className="gap-1 h-8 text-xs"><Download className="h-3 w-3" /> Export</Button>
              </div>
            </div>
            <div className="rounded-xl border border-border overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Learner</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Country</TableHead><TableHead>Course</TableHead><TableHead>Price</TableHead><TableHead>Enrolled</TableHead><TableHead>Paid Status</TableHead><TableHead>Payment ID</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredEnrollments.map((e) => {
                    const course = courses.find(c => c.id === e.course_id);
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="text-foreground font-medium">{e.full_name}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{e.email}</TableCell>
                        <TableCell className="text-muted-foreground">{e.contact_number}</TableCell>
                        <TableCell className="text-muted-foreground">{e.country}</TableCell>
                        <TableCell className="text-foreground">{course?.title || "—"}</TableCell>
                        <TableCell className="text-foreground">${course?.price_usd || 0}</TableCell>
                        <TableCell className="text-muted-foreground">{new Date(e.enrolled_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Select value={e.payment_status} onValueChange={(val) => changePaymentStatus(e, val)} disabled={updatingStatus === e.id}>
                            <SelectTrigger className={`w-24 h-7 text-xs border-0 ${e.payment_status === "paid" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="paid">Paid</SelectItem><SelectItem value="pending">Unpaid</SelectItem></SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">{e.payment_id || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredEnrollments.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No enrollments match your filters</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── List view ───
  return (
    <div className="space-y-5">
      {/* Live Sync Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className={`h-2 w-2 rounded-full ${isLive ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`} />
            <span className="text-xs font-medium text-muted-foreground">{isLive ? "Live Updating" : "Paused"}</span>
          </div>
          <span className="text-xs text-muted-foreground">Last Sync: {lastSyncTime.toLocaleTimeString()}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant={isLive ? "secondary" : "outline"} onClick={() => setIsLive(!isLive)} className="gap-1.5 text-xs h-7">
            <Activity className="h-3 w-3" /> {isLive ? "Pause" : "Resume"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => fetchAll(true)} className="gap-1.5 text-xs h-7">
            <Clock className="h-3 w-3" /> Refresh
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-7">
        <div className="rounded-xl border border-border bg-card p-4"><Shield className="h-5 w-5 text-primary mb-2" /><p className="text-2xl font-bold text-foreground">{coaches.length}</p><p className="text-xs text-muted-foreground">Total Coaches</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><CheckCircle className="h-5 w-5 text-green-400 mb-2" /><p className="text-2xl font-bold text-foreground">{activeCoaches}</p><p className="text-xs text-muted-foreground">Active Coaches</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><Eye className="h-5 w-5 text-emerald-400 mb-2" /><p className="text-2xl font-bold text-foreground">{coaches.filter(c => (c.public_listing_status ?? "active") === "active" && !c.is_suspended).length}</p><p className="text-xs text-muted-foreground">Publicly Listed</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><BookOpen className="h-5 w-5 text-blue-400 mb-2" /><p className="text-2xl font-bold text-foreground">{courses.length}</p><p className="text-xs text-muted-foreground">Courses Created</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><Users className="h-5 w-5 text-purple-400 mb-2" /><p className="text-2xl font-bold text-foreground">{totalStudents.toLocaleString()}</p><p className="text-xs text-muted-foreground">Total Students</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><Star className="h-5 w-5 text-yellow-400 mb-2" /><p className="text-2xl font-bold text-foreground">⭐ {avgRating > 0 ? avgRating.toFixed(1) : "—"}</p><p className="text-xs text-muted-foreground">Avg Rating</p></div>
        <div className="rounded-xl border border-border bg-card p-4"><DollarSign className="h-5 w-5 text-green-400 mb-2" /><p className="text-2xl font-bold text-foreground">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p><p className="text-xs text-muted-foreground">Revenue Generated</p></div>
      </div>

      {/* Alerts */}
      {topCoach && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-3">
          <Trophy className="h-5 w-5 text-primary shrink-0" />
          <p className="text-sm text-foreground"><span className="font-semibold">"{topCoach.full_name}"</span> is the top coach this period with <span className="font-semibold text-green-400">${topCoach.revenue.toFixed(0)}</span> in revenue</p>
        </div>
      )}

      {/* Analytics Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Coach Performance Comparison */}
        {coachPerformanceData.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground mb-4">Coach Performance Comparison (Top 8)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={coachPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenue ($)" />
                <Bar dataKey="students" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name="Students" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Status Distribution Pie */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Coach Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                {statusPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Trend */}
      {revenueTrend.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Revenue Trend (12 Months)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={revenueTrend}>
              <defs>
                <linearGradient id="coachRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
              <Area type="monotone" dataKey="revenue" stroke="#22c55e" fill="url(#coachRevGrad)" strokeWidth={2} name="Revenue ($)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table Header + Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-foreground">Coach Management</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedIds.size > 0 && (
              <Button size="sm" variant="secondary" onClick={handleBulkEmail} className="gap-1.5"><Mail className="h-3.5 w-3.5" /> Campaign ({selectedIds.size})</Button>
            )}
            <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5"><Download className="h-3.5 w-3.5" /> Export CSV</Button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search name, company, phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary border-border w-60" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 bg-secondary border-border"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="suspended">Suspended</SelectItem></SelectContent>
          </Select>
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-36 bg-secondary border-border"><SelectValue placeholder="Country" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Countries</SelectItem>{countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-32 bg-secondary border-border"><SelectValue placeholder="City" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Cities</SelectItem>{cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-36 bg-secondary border-border"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {coachCategories.map(cat => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {hasFilters && <Button size="sm" variant="ghost" onClick={clearFilters} className="gap-1 text-muted-foreground"><X className="h-3.5 w-3.5" /> Clear</Button>}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16"><Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">No coaches found</p></div>
      ) : (
        <>
          <div className="rounded-xl border border-border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"><Checkbox checked={selectedIds.size === filtered.length && filtered.length > 0} onCheckedChange={toggleSelectAll} /></TableHead>
                  {[
                    { label: "Name", field: "name" },
                    { label: "Learners", field: "students" },
                    { label: "Programs", field: "courses" },
                    { label: "Earnings (₹)", field: "earnings" },
                    { label: "Due (₹)", field: "due" },
                    { label: "Payment", field: "status" },
                    { label: "Email", field: "email" },
                    { label: "Category", field: "category" },
                    { label: "Phone", field: "country" },
                    { label: "City", field: "last_active" },
                  ].map(col => (
                    <TableHead key={col.field}>
                      <button onClick={() => toggleSort(col.field)} className="flex items-center gap-1 hover:text-foreground transition-colors group">
                        {col.label}
                        {sortField === col.field ? (
                          sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                        )}
                      </button>
                    </TableHead>
                  ))}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedCoaches.map((c) => {
                  const s = getCoachStats(c.user_id);
                  const f = getCoachFinancials(c.user_id);
                  const payStatus = coachPaymentStatuses[c.user_id] || "pending";
                  return (
                    <TableRow key={c.id} className={`${selectedIds.has(c.user_id) ? "bg-primary/5" : ""} ${f.totalDueINR > 10000 ? "border-l-2 border-l-destructive" : f.totalEarningsINR > 5000 ? "border-l-2 border-l-green-500" : ""}`}>
                      <TableCell><Checkbox checked={selectedIds.has(c.user_id)} onCheckedChange={() => toggleSelect(c.user_id)} /></TableCell>
                      <TableCell className="text-foreground font-medium">{c.full_name || "—"}</TableCell>
                      <TableCell className="text-foreground">{s.totalStudents}</TableCell>
                      <TableCell className="text-foreground text-xs">
                        <span>Course ({s.courses})</span>
                        <span className="text-muted-foreground"> | </span>
                        <span>Webinar ({s.webinars})</span>
                      </TableCell>
                      <TableCell className="font-semibold text-green-400">₹{f.totalEarningsINR.toFixed(0)}</TableCell>
                      <TableCell className={`font-semibold ${f.totalDueINR > 10000 ? "text-destructive" : "text-foreground"}`}>₹{f.totalDueINR.toFixed(0)}</TableCell>
                      <TableCell>
                        <Select value={payStatus} onValueChange={(val) => changeCoachPaymentStatus(c.user_id, val)} disabled={updatingCoachPayment === c.user_id}>
                          <SelectTrigger className={`w-[110px] h-7 text-xs border-0 ${payStatus === "paid" ? "bg-green-500/20 text-green-400" : payStatus === "transferred" ? "bg-blue-500/20 text-blue-400" : payStatus === "pay_soon" ? "bg-orange-500/20 text-orange-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="transferred">Transferred</SelectItem>
                            <SelectItem value="pay_soon">Pay You Soon</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{c.email || "—"}</TableCell>
                      <TableCell className="text-xs">
                        {c.category_id ? (
                          <Badge variant="secondary" className="text-xs">{coachCategories.find(cat => cat.id === c.category_id)?.name || "—"}</Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{c.contact_number || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{c.city || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setPerformanceCoach(c)} className="text-blue-400 hover:text-blue-300" title="Performance"><BarChart3 className="h-4 w-4" /></button>
                          <button onClick={() => setSelectedCoach(c)} className="text-primary hover:text-primary/80" title="View"><Eye className="h-4 w-4" /></button>
                          <button onClick={() => toggleSuspend(c)} className={c.is_suspended ? "text-green-400 hover:text-green-300" : "text-yellow-400 hover:text-yellow-300"} title={c.is_suspended ? "Activate" : "Suspend"}>
                            {c.is_suspended ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                          </button>
                          <button onClick={() => deleteCoach(c)} className="text-destructive hover:text-destructive/80" title="Delete"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} coaches</p>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></Button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const page = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                return (
                  <Button key={page} size="sm" variant={currentPage === page ? "default" : "ghost"} onClick={() => setCurrentPage(page)} className="h-8 w-8 p-0 text-xs">{page}</Button>
                );
              })}
              <Button size="sm" variant="ghost" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="h-8 w-8 p-0"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </>
      )}

      {/* Performance Modal */}
      <Dialog open={!!performanceCoach} onOpenChange={(open) => !open && setPerformanceCoach(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {performanceCoach && (() => {
            const s = getCoachStats(performanceCoach.user_id);
            const f = getCoachFinancials(performanceCoach.user_id);
            const coachCourseList = courses.filter(c => c.coach_id === performanceCoach.user_id);
            const coachWebinarList = webinars.filter(w => w.coach_id === performanceCoach.user_id);
            const recentEnrolls = enrollments.filter(e => e.coach_id === performanceCoach.user_id).sort((a, b) => new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime()).slice(0, 10);

            // Monthly earnings trend
            const monthlyData: Record<string, number> = {};
            enrollments.filter(e => e.coach_id === performanceCoach.user_id && e.payment_status === "paid").forEach(e => {
              const d = new Date(e.enrolled_at);
              const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
              const course = e.courses as any;
              monthlyData[key] = (monthlyData[key] || 0) + Number(course?.price_inr || 0);
            });
            const trendData = Object.entries(monthlyData).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([month, amount]) => ({
              month: new Date(month + "-01").toLocaleDateString("en-US", { month: "short" }),
              amount,
            }));

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary font-bold">{performanceCoach.full_name?.[0] || "C"}</div>
                    <div>
                      <p>{performanceCoach.full_name}</p>
                      <p className="text-xs text-muted-foreground font-normal">{performanceCoach.email}</p>
                    </div>
                  </DialogTitle>
                </DialogHeader>

                {/* Financial Summary */}
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                  <div className="rounded-lg border border-border bg-card p-3">
                    <IndianRupee className="h-4 w-4 text-green-400 mb-1" />
                    <p className="text-lg font-bold text-foreground">₹{f.totalEarningsINR.toFixed(0)}</p>
                    <p className="text-[10px] text-muted-foreground">Total Earnings</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <IndianRupee className="h-4 w-4 text-foreground mb-1" />
                    <p className="text-lg font-bold text-foreground">₹{f.totalDueINR.toFixed(0)}</p>
                    <p className="text-[10px] text-muted-foreground">Total Due</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <Users className="h-4 w-4 text-primary mb-1" />
                    <p className="text-lg font-bold text-foreground">{s.totalStudents}</p>
                    <p className="text-[10px] text-muted-foreground">Total Learners</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <Video className="h-4 w-4 text-blue-400 mb-1" />
                    <p className="text-lg font-bold text-foreground">{f.webinarRegCount}</p>
                    <p className="text-[10px] text-muted-foreground">Webinar Regs</p>
                  </div>
                </div>

                {/* Commission Breakdown */}
                <div className="rounded-lg border border-border p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">Commission Breakdown</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Course Commission ({f.courseCommPercent}%)</span>
                    <span className="text-foreground">₹{f.courseCommINR.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Webinar Commission ({f.webinarCommPercent}%)</span>
                    <span className="text-foreground">₹{f.webinarCommINR.toFixed(0)}</span>
                  </div>
                  <div className="border-t border-border pt-2 flex justify-between text-sm font-semibold">
                    <span className="text-foreground">Net Payable to Coach</span>
                    <span className="text-green-400">₹{f.totalDueINR.toFixed(0)}</span>
                  </div>
                </div>

                {/* Course vs Webinar Split */}
                <div className="grid gap-3 grid-cols-2">
                  <div className="rounded-lg border border-border p-3">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">Courses ({s.courses})</h4>
                    {coachCourseList.slice(0, 5).map(c => (
                      <p key={c.id} className="text-xs text-foreground truncate">• {c.title}</p>
                    ))}
                    {coachCourseList.length === 0 && <p className="text-xs text-muted-foreground">No courses</p>}
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">Webinars ({s.webinars})</h4>
                    {coachWebinarList.slice(0, 5).map(w => (
                      <p key={w.id} className="text-xs text-foreground truncate">• {w.title}</p>
                    ))}
                    {coachWebinarList.length === 0 && <p className="text-xs text-muted-foreground">No webinars</p>}
                  </div>
                </div>

                {/* Monthly Trend */}
                {trendData.length > 0 && (
                  <div className="rounded-lg border border-border p-4">
                    <h4 className="text-sm font-semibold text-foreground mb-3">Monthly Earnings Trend</h4>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={trendData}>
                        <defs>
                          <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} formatter={(value: number) => [`₹${value.toFixed(0)}`, "Earnings"]} />
                        <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" fill="url(#perfGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Recent Registrations */}
                {recentEnrolls.length > 0 && (
                  <div className="rounded-lg border border-border p-4">
                    <h4 className="text-sm font-semibold text-foreground mb-2">Recent Registrations</h4>
                    <div className="space-y-1.5">
                      {recentEnrolls.map(e => (
                        <div key={e.id} className="flex items-center justify-between text-xs">
                          <span className="text-foreground">{e.full_name}</span>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 ${e.payment_status === "paid" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>{e.payment_status}</span>
                            <span className="text-muted-foreground">{new Date(e.enrolled_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCoaches;
