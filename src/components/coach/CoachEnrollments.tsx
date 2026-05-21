import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useContactAccess } from "@/hooks/useContactAccess";
import { useUserRole } from "@/hooks/useUserRole";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Download, Search, DollarSign, IndianRupee, Globe, RefreshCw, Lock, KeyRound, BookOpen, Video } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import GlobalDateRangePicker, { useDateRange } from "@/components/shared/GlobalDateRangePicker";

const USD_TO_INR_FALLBACK = 83.5;

const useExchangeRate = () => {
  const [rate, setRate] = useState<number>(USD_TO_INR_FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://open.er-api.com/v6/latest/USD")
      .then((r) => r.json())
      .then((data) => {
        if (data?.rates?.INR) setRate(data.rates.INR);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { rate, loading };
};

const CoachEnrollments = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { hasAccess, isPending, requestAccess } = useContactAccess();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [combinedRows, setCombinedRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { rate: usdToInr } = useExchangeRate();
  const { dateRange, setDateRange, dateFrom, dateTo } = useDateRange("last30");

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      // Fetch course enrollments
      const { data: enrollData } = await supabase
        .from("enrollments")
        .select("*, courses(title, price_usd, price_inr)")
        .eq("coach_id", user.id)
        .order("enrolled_at", { ascending: false });

      const courseRows = (enrollData || []).map((e: any) => ({ ...e, row_type: "Course" }));
      setEnrollments(courseRows);

      // Fetch webinar registrations
      const { data: webinarData } = await supabase
        .from("webinars")
        .select("id, title")
        .eq("coach_id", user.id);

      if (webinarData && webinarData.length > 0) {
        const webinarMap = new Map(webinarData.map((w: any) => [w.id, w.title]));
        const { data: regs } = await supabase
          .from("webinar_registrations")
          .select("id, learner_id, registered_at, attended, converted, amount_paid, registrant_name, registrant_email, registrant_phone, payment_status, webinar_id")
          .in("webinar_id", webinarData.map((w: any) => w.id))
          .order("registered_at", { ascending: false });

        if (regs && regs.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, email, contact_number, country, city, industry, current_job_title, whatsapp_number, education_qualification, experience_level")
            .in("user_id", regs.map((r: any) => r.learner_id));
          const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

          const webinarRows = regs.map((r: any) => {
            const profile = profileMap.get(r.learner_id);
            return {
              id: r.id,
              row_type: "Webinar",
              full_name: profile?.full_name || r.registrant_name || "Unknown",
              email: profile?.email || r.registrant_email || "—",
              contact_number: profile?.contact_number || r.registrant_phone || "—",
              whatsapp_number: profile?.whatsapp_number || "—",
              country: profile?.country || "—",
              city: profile?.city || "—",
              industry: profile?.industry || "—",
              current_job_title: profile?.current_job_title || "—",
              experience_level: profile?.experience_level || "—",
              education_qualification: profile?.education_qualification || "—",
              linkedin_profile: null,
              learner_id: r.learner_id,
              enrolled_at: r.registered_at,
              payment_status: r.payment_status || (r.amount_paid > 0 ? "paid" : "free"),
              amount_paid: r.amount_paid,
              currency: "INR",
              payment_locked: true,
              courses: { title: webinarMap.get(r.webinar_id) || "Webinar", price_usd: 0, price_inr: r.amount_paid || 0 },
            };
          });
          setCombinedRows([...courseRows, ...webinarRows]);
        } else {
          setCombinedRows(courseRows);
        }
      } else {
        setCombinedRows(courseRows);
      }
      setLoading(false);
    };
    fetchAll();
  }, [user]);

  const handlePaymentStatusChange = async (enrollmentId: string, newStatus: string) => {
    const enrollment = enrollments.find((e) => e.id === enrollmentId);
    // Block if locked and not admin
    if (enrollment?.payment_locked && !isAdmin) {
      toast({
        title: "Payment locked",
        description: "Payment status is locked. Contact admin for changes.",
        variant: "destructive",
      });
      return;
    }

    setUpdatingId(enrollmentId);
    try {
      const updatePayload: any = { payment_status: newStatus };
      // Lock payment when coach marks as paid
      if (newStatus === "paid" && !isAdmin) {
        updatePayload.payment_locked = true;
      }

      const { error } = await supabase
        .from("enrollments")
        .update(updatePayload)
        .eq("id", enrollmentId);

      if (error) throw error;

      setEnrollments((prev) =>
        prev.map((e) => (e.id === enrollmentId ? { ...e, ...updatePayload } : e))
      );

      if (newStatus === "paid") {
        supabase.functions.invoke("send-payment-confirmation", {
          body: { enrollmentId },
        }).then(({ error: fnError }) => {
          if (fnError) console.error("Email notification error:", fnError);
        });
      }

      toast({
        title: "Payment status updated",
        description: `Status changed to "${newStatus}" successfully.${!isAdmin && newStatus === "paid" ? " Payment is now locked." : ""}`,
      });
    } catch (err: any) {
      toast({
        title: "Update failed",
        description: err.message || "Could not update payment status.",
        variant: "destructive",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRequestAccess = async (learnerId: string) => {
    const { error } = await requestAccess(learnerId, "learner");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Access requested", description: "Admin will review your request." });
    }
  };

  if (loading) return <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mt-8" />;

  const filtered = combinedRows.filter((e) => {
    const q = search.toLowerCase();
    const d = e.enrolled_at?.slice(0, 10);
    if (dateFrom && d < dateFrom) return false;
    if (dateTo && d > dateTo) return false;
    if (typeFilter !== "all" && e.row_type !== typeFilter) return false;
    return !q || e.full_name?.toLowerCase().includes(q) || (e.courses as any)?.title?.toLowerCase().includes(q) || e.country?.toLowerCase().includes(q);
  });

  const totalEnrollments = combinedRows.length;
  const paidEnrollments = combinedRows.filter((e) => e.payment_status === "paid");

  let rawUSD = 0;
  let rawINR = 0;
  paidEnrollments.forEach((e) => {
    const course = e.courses as any;
    if (e.currency === "USD") {
      rawUSD += Number(course?.price_usd || 0);
    } else {
      rawINR += Number(course?.price_inr || 0);
    }
  });

  const combinedTotalUSD = rawUSD + (rawINR / usdToInr);
  const combinedTotalINR = (rawUSD * usdToInr) + rawINR;

  const countries = [...new Set(combinedRows.map((e) => e.country))];

  const exportCSV = () => {
    const headers = ["Type", "Name", "Course/Webinar", "Fee", "Amount Paid", "Country", "City", "Industry", "Job Title", "Experience", "Education", "Payment", "Locked", "Date"];
    const rows = filtered.map((e) => {
      const course = e.courses as any;
      const fee = e.currency === "USD" ? `$${course?.price_usd || 0}` : `₹${course?.price_inr || 0}`;
      const paid = e.amount_paid ? (e.currency === "USD" ? `$${e.amount_paid}` : `₹${e.amount_paid}`) : "—";
      return [
        e.row_type, e.full_name, course?.title, fee, paid, e.country, e.city, e.industry,
        e.current_job_title, e.experience_level, e.education_qualification,
        e.payment_status, e.payment_locked ? "Yes" : "No", new Date(e.enrolled_at).toLocaleDateString()
      ];
    });
    const csv = [headers, ...rows].map((r) => r.map((v: string) => `"${(v || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "enrollments.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const ContactCell = ({ enrollment }: { enrollment: any }) => {
    const learnerId = enrollment.learner_id;
    if (hasAccess(learnerId)) {
      return (
        <>
          <TableCell className="text-foreground whitespace-nowrap">{enrollment.email}</TableCell>
          <TableCell className="text-foreground whitespace-nowrap">{enrollment.contact_number}</TableCell>
          <TableCell className="text-foreground whitespace-nowrap">{enrollment.whatsapp_number}</TableCell>
        </>
      );
    }
    return (
      <>
        <TableCell colSpan={3} className="text-center">
          <div className="flex items-center gap-2 justify-center">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Contact info hidden</span>
            {isPending(learnerId) ? (
              <Badge variant="outline" className="text-yellow-400 border-yellow-500/30 text-xs">Pending</Badge>
            ) : (
              <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => handleRequestAccess(learnerId)}>
                <KeyRound className="h-3 w-3" /> Request Access
              </Button>
            )}
          </div>
        </TableCell>
      </>
    );
  };

  const isPaymentEditable = (enrollment: any) => {
    if (isAdmin) return true;
    return !enrollment.payment_locked;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-foreground">Enrollment Analytics</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <GlobalDateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Course">
                <span className="flex items-center gap-1.5"><BookOpen className="h-3 w-3" /> Course</span>
              </SelectItem>
              <SelectItem value="Webinar">
                <span className="flex items-center gap-1.5"><Video className="h-3 w-3" /> Webinar</span>
              </SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name, course..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-64" />
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-border bg-card p-4">
          <Users className="h-5 w-5 text-primary mb-2" />
          <p className="text-2xl font-bold text-foreground">{totalEnrollments}</p>
          <p className="text-xs text-muted-foreground">Total Enrollments</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <Globe className="h-5 w-5 text-primary mb-2" />
          <p className="text-2xl font-bold text-foreground">{countries.length}</p>
          <p className="text-xs text-muted-foreground">Countries</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <Users className="h-5 w-5 text-green-400 mb-2" />
          <p className="text-2xl font-bold text-foreground">{paidEnrollments.length}</p>
          <p className="text-xs text-muted-foreground">Paid Enrollments</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <DollarSign className="h-5 w-5 text-green-400 mb-2" />
          <p className="text-2xl font-bold text-foreground">${combinedTotalUSD.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Total Earnings (USD)</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <IndianRupee className="h-5 w-5 text-green-400 mb-2" />
          <p className="text-2xl font-bold text-foreground">₹{combinedTotalINR.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Total Earnings (INR)</p>
        </div>
        <div className="col-span-2 sm:col-span-1 rounded-xl border border-border bg-card p-4">
          <RefreshCw className="h-5 w-5 text-muted-foreground mb-2" />
          <p className="text-lg font-bold text-foreground">1 USD = ₹{usdToInr.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Live Exchange Rate</p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{search ? "No matching learners found" : "No enrollments yet"}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Course / Webinar</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Amount Paid</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Education</TableHead>
                <TableHead>LinkedIn</TableHead>
                <TableHead>Payment Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] gap-1 ${e.row_type === "Course" ? "text-primary border-primary/30" : "text-blue-400 border-blue-500/30"}`}>
                      {e.row_type === "Course" ? <BookOpen className="h-3 w-3" /> : <Video className="h-3 w-3" />}
                      {e.row_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-foreground font-medium whitespace-nowrap">{e.full_name}</TableCell>
                  <ContactCell enrollment={e} />
                  <TableCell className="text-foreground whitespace-nowrap">{(e.courses as any)?.title}</TableCell>
                  <TableCell className="text-foreground whitespace-nowrap">
                    {e.currency === "USD"
                      ? `$${(e.courses as any)?.price_usd || 0}`
                      : `₹${(e.courses as any)?.price_inr || 0}`}
                  </TableCell>
                  <TableCell className="text-foreground whitespace-nowrap font-medium">
                    {e.amount_paid
                      ? (e.currency === "USD" ? `$${e.amount_paid}` : `₹${e.amount_paid}`)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{e.country}</TableCell>
                  <TableCell className="text-muted-foreground">{e.city}</TableCell>
                  <TableCell className="text-muted-foreground">{e.industry}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{e.current_job_title}</TableCell>
                  <TableCell className="text-muted-foreground">{e.experience_level}</TableCell>
                  <TableCell className="text-muted-foreground">{e.education_qualification}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.linkedin_profile ? <a href={e.linkedin_profile} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">View</a> : "—"}
                  </TableCell>
                  <TableCell>
                    {isPaymentEditable(e) ? (
                      <Select
                        value={e.payment_status}
                        onValueChange={(val) => handlePaymentStatusChange(e.id, val)}
                        disabled={updatingId === e.id}
                      >
                        <SelectTrigger className="w-[120px] h-8 text-xs bg-popover border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border z-[9999]">
                          <SelectItem value="pending">
                            <span className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-yellow-400" />
                              Pending
                            </span>
                          </SelectItem>
                          <SelectItem value="paid">
                            <span className="flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-green-400" />
                              Paid
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-green-400 border-green-500/30 text-xs gap-1">
                                <Lock className="h-3 w-3" />
                                {e.payment_status === "paid" ? "Paid" : e.payment_status}
                              </Badge>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Locked after update. Admin approval required.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{new Date(e.enrolled_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default CoachEnrollments;
