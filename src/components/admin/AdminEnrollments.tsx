import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Download, Search, Users, DollarSign, Clock, CheckCircle } from "lucide-react";

const AdminEnrollments = () => {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [webinarRegs, setWebinarRegs] = useState<any[]>([]);
  const [webinars, setWebinars] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [coachFilter, setCoachFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      const [e, c, p, wr, w] = await Promise.all([
        supabase.from("enrollments").select("*").order("enrolled_at", { ascending: false }),
        supabase.from("courses").select("id, title, coach_id, price_usd"),
        supabase.from("profiles").select("user_id, full_name, email, contact_number"),
        supabase.from("webinar_registrations").select("*"),
        supabase.from("webinars").select("id, title, coach_id"),
      ]);
      setEnrollments(e.data || []);
      setCourses(c.data || []);
      setProfiles(p.data || []);
      setWebinarRegs(wr.data || []);
      setWebinars(w.data || []);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const courseName = (id: string) => courses.find(c => c.id === id)?.title || "—";
  const coachName = (id: string) => profiles.find(p => p.user_id === id)?.full_name || "—";

  const coaches = useMemo(() => {
    const ids = [...new Set(enrollments.map(e => e.coach_id))];
    return ids.map(id => ({ id, name: coachName(id) }));
  }, [enrollments, profiles]);

  const filtered = useMemo(() => {
    return enrollments.filter(e => {
      const matchSearch = !search || [e.full_name, e.email, courseName(e.course_id)].some(v => v?.toLowerCase().includes(search.toLowerCase()));
      const matchPayment = paymentFilter === "all" || e.payment_status === paymentFilter;
      const matchCoach = coachFilter === "all" || e.coach_id === coachFilter;
      const d = e.enrolled_at?.split("T")[0];
      const matchFrom = !dateFrom || d >= dateFrom;
      const matchTo = !dateTo || d <= dateTo;
      return matchSearch && matchPayment && matchCoach && matchFrom && matchTo;
    });
  }, [enrollments, search, paymentFilter, coachFilter, dateFrom, dateTo, courses, profiles]);

  const getWebinarNames = (learnerId: string) => {
    const ids = webinarRegs.filter(r => r.learner_id === learnerId).map(r => r.webinar_id);
    return webinars.filter(w => ids.includes(w.id)).map(w => w.title).join(", ") || "—";
  };

  const exportCSV = () => {
    const headers = ["Learner Name", "Email", "Phone", "Course", "Coach", "Registered Webinars", "Payment Status", "Amount Paid", "Payment ID", "Currency", "Enrolled Date"];
    const rows = filtered.map(e => [
      e.full_name, e.email, e.contact_number, courseName(e.course_id), coachName(e.coach_id),
      getWebinarNames(e.learner_id), e.payment_status, Number(e.amount_paid || 0).toFixed(2),
      e.payment_id || "—", e.currency || "USD", new Date(e.enrolled_at).toLocaleDateString()
    ]);
    const csv = [headers, ...rows].map(r => r.map((v: any) => `"${v || ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "enrollment_payment_report.csv";
    a.click();
  };

  const totalPaid = filtered.filter(e => e.payment_status === "paid").reduce((s, e) => s + Number(e.amount_paid || 0), 0);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground tracking-tight">Enrollment & Payment Tracking</h2>
          <p className="text-sm text-muted-foreground mt-1">Monitor learner enrollments and payment activity</p>
        </div>
        <button onClick={exportCSV} className="badge-pill border border-border/50 bg-secondary/80 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all duration-200 gap-1.5 cursor-pointer">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search learner, email, course..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-secondary/50 border-border/50 w-56 h-10 rounded-xl text-sm" />
        </div>
        <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value)} className="rounded-xl border border-border/50 bg-secondary/50 px-3 py-2 text-sm text-foreground h-10 transition-colors hover:border-border">
          <option value="all">All Payments</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="pay_later">Pay Later</option>
          <option value="failed">Failed</option>
        </select>
        <select value={coachFilter} onChange={e => setCoachFilter(e.target.value)} className="rounded-xl border border-border/50 bg-secondary/50 px-3 py-2 text-sm text-foreground h-10 transition-colors hover:border-border">
          <option value="all">All Coaches</option>
          {coaches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-secondary/50 border-border/50 w-40 h-10 rounded-xl text-sm" />
        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-secondary/50 border-border/50 w-40 h-10 rounded-xl text-sm" />
      </div>

      {/* Stats */}
      <div className="stat-grid">
        {[
          { label: "Total Enrollments", value: filtered.length, icon: Users, color: "text-foreground" },
          { label: "Paid", value: filtered.filter(e => e.payment_status === "paid").length, icon: CheckCircle, color: "text-green-400" },
          { label: "Pending", value: filtered.filter(e => e.payment_status === "pending").length, icon: Clock, color: "text-yellow-400" },
          { label: "Total Revenue", value: `$${totalPaid.toFixed(2)}`, icon: DollarSign, color: "text-foreground" },
        ].map((stat) => (
          <div key={stat.label} className="card-premium rounded-2xl p-5 flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <stat.icon className="h-5 w-5 text-primary icon-glow" />
            </div>
            <div className="min-w-0">
              <p className={`text-2xl font-bold ${stat.color} tracking-tight`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card-premium rounded-2xl text-center py-20">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">No enrollments found</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Learner</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Coach</TableHead>
              <TableHead>Webinars</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Payment ID</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(e => (
              <TableRow key={e.id}>
                <TableCell className="text-foreground font-medium">{e.full_name}</TableCell>
                <TableCell className="text-muted-foreground">{e.email}</TableCell>
                <TableCell className="text-muted-foreground max-w-[150px] truncate">{courseName(e.course_id)}</TableCell>
                <TableCell className="text-muted-foreground">{coachName(e.coach_id)}</TableCell>
                <TableCell className="text-muted-foreground max-w-[120px] truncate">{getWebinarNames(e.learner_id)}</TableCell>
                <TableCell className="text-center">
                  <span className={`badge-pill ${e.payment_status === "paid" ? "bg-green-500/15 text-green-400" : e.payment_status === "failed" ? "bg-red-500/15 text-red-400" : "bg-yellow-500/15 text-yellow-400"}`}>
                    {e.payment_status}
                  </span>
                </TableCell>
                <TableCell className="text-right text-foreground font-medium tabular-nums">${Number(e.amount_paid || 0).toFixed(2)}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">{e.payment_id || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(e.enrolled_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default AdminEnrollments;
