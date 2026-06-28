import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Video, Calendar, Clock, User, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useNavigate } from "react-router-dom";
import { useSEO } from "@/hooks/useSEO";
import { useRazorpayCheckout } from "@/hooks/useRazorpayCheckout";

interface WebinarWithCoach {
  id: string;
  title: string;
  description: string | null;
  webinar_date: string;
  webinar_time: string;
  duration_minutes: number;
  webinar_link: string;
  webinar_link_status: string;
  coach_id: string;
  coach_name?: string;
  is_paid: boolean;
  price_usd: number;
  price_inr: number;
  max_attendees: number | null;
  timezone: string;
  is_recurring: boolean;
  webinar_type: string;
}

const Webinars = () => {
  useSEO({
    title: "Live AI Webinars | AI Coach Portal",
    description: "Join upcoming live AI webinars from top coaches. Free and paid sessions on prompt engineering, AI automation, and the latest AI trends.",
    canonical: "https://www.aicoachportal.com/webinars",
  });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [webinars, setWebinars] = useState<WebinarWithCoach[]>([]);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { openCheckout } = useRazorpayCheckout();

  useEffect(() => {
    const fetchData = async () => {
      const { data: webinarData } = await supabase
        .from("webinars")
        .select("*")
        .eq("is_published", true)
        .order("webinar_date", { ascending: true });

      const coachIds = [...new Set((webinarData || []).map((w: any) => w.coach_id))];
      let coachMap = new Map<string, string>();
      if (coachIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", coachIds);
        (profiles || []).forEach((p: any) => coachMap.set(p.user_id, p.full_name || "Coach"));
      }

      setWebinars((webinarData || []).map((w: any) => ({
        ...w,
        coach_name: coachMap.get(w.coach_id) || "Coach",
      })));

      if (user) {
        const { data: regs } = await supabase
          .from("webinar_registrations")
          .select("webinar_id")
          .eq("learner_id", user.id);
        setRegisteredIds(new Set((regs || []).map((r: any) => r.webinar_id)));
      }

      setLoading(false);
    };
    fetchData();
  }, [user]);

  const registerForWebinar = async (webinar: WebinarWithCoach) => {
    if (!user) {
      navigate("/auth?mode=login");
      return;
    }
    setRegistering(webinar.id);

    // Fetch profile for registration details
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, contact_number")
      .eq("user_id", user.id)
      .single();

    const fullName = profile?.full_name || user.email?.split("@")[0] || "Unknown";
    const email = profile?.email || user.email || "";
    const phone = profile?.contact_number || "";

    // Paid webinar → resolve configured payment method (admin-managed)
    const priceInr = Number(webinar.price_inr ?? 0);
    const priceUsd = Number(webinar.price_usd ?? 0);
    const isPaid = webinar.is_paid && (priceInr > 0 || priceUsd > 0);
    const method = ((webinar as any).payment_method as string | null) || (isPaid ? "razorpay_api" : "free");
    const linkUrl = ((webinar as any).payment_link_url as string | null) || "";

    // Payment Link / External URL → save pending registration, then redirect
    if (isPaid && (method === "payment_link" || method === "external") && linkUrl) {
      const { error } = await supabase.from("webinar_registrations").insert({
        webinar_id: webinar.id,
        learner_id: user.id,
        registrant_name: fullName,
        registrant_email: email,
        registrant_phone: phone,
        payment_status: "pending",
      } as any);
      if (error) {
        setRegistering(null);
        toast({ title: "Could not save registration", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Redirecting to payment...", description: "Complete payment to confirm your seat." });
      setTimeout(() => { window.location.href = linkUrl; }, 400);
      return;
    }

    // Manual / Offline → just record pending and notify
    if (isPaid && method === "manual") {
      const { error } = await supabase.from("webinar_registrations").insert({
        webinar_id: webinar.id,
        learner_id: user.id,
        registrant_name: fullName,
        registrant_email: email,
        registrant_phone: phone,
        payment_status: "pending",
      } as any);
      setRegistering(null);
      if (error) {
        toast({ title: "Could not register", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Registration received", description: "Our team will contact you to confirm payment." });
      setRegisteredIds(new Set([...registeredIds, webinar.id]));
      return;
    }

    if (isPaid) {
      // Default: Razorpay in-app checkout
      await openCheckout({
        webinarId: webinar.id,
        kind: "webinar",
        currency: priceInr > 0 ? "INR" : "USD",
        registrationData: {
          full_name: fullName,
          email,
          contact_number: phone,
          registrant_name: fullName,
          registrant_email: email,
          registrant_phone: phone,
        },
        prefill: { name: fullName, email, contact: phone },
        onSuccess: () => {
          setRegisteredIds(new Set([...registeredIds, webinar.id]));
          setRegistering(null);
        },
        onDismiss: () => setRegistering(null),
      });
      return;
    }


    // Free webinar — original flow
    const { error } = await supabase.from("webinar_registrations").insert({
      webinar_id: webinar.id,
      learner_id: user.id,
      registrant_name: fullName,
      registrant_email: email,
      registrant_phone: phone,
    } as any);

    if (error) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
      setRegistering(null);
      return;
    }

    try {
      await supabase.functions.invoke("send-webinar-confirmation", {
        body: { webinar_id: webinar.id, learner_id: user.id },
      });
    } catch {}

    setRegisteredIds(new Set([...registeredIds, webinar.id]));
    toast({ title: "Registered!", description: `You're registered for "${webinar.title}"` });
    setRegistering(null);
  };

  const now = new Date();
  const getEndTime = (w: WebinarWithCoach) => {
    const start = new Date(`${w.webinar_date}T${w.webinar_time}`);
    return new Date(start.getTime() + w.duration_minutes * 60000);
  };
  const isLive = (w: WebinarWithCoach) => {
    const start = new Date(`${w.webinar_date}T${w.webinar_time}`);
    return now >= start && now <= getEndTime(w);
  };

  const upcoming = webinars.filter((w) => getEndTime(w) >= now);
  const filtered = upcoming.filter((w) =>
    !search || w.title.toLowerCase().includes(search.toLowerCase()) || w.coach_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="mx-auto max-w-4xl text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Upcoming Webinars</h1>
          <p className="mt-3 text-muted-foreground">Join live sessions from top coaches — free and open for everyone.</p>
        </div>

        <div className="mx-auto max-w-md mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search webinars or coaches..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No upcoming webinars</h3>
            <p className="text-sm text-muted-foreground">Check back later for new sessions</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((w) => {
              const live = isLive(w);
              const registered = registeredIds.has(w.id);
              return (
                <div key={w.id} className="rounded-xl border border-border bg-card p-5 space-y-3 flex flex-col">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${live ? "bg-green-500/20 text-green-400" : "bg-primary/20 text-primary"}`}>
                        {live ? "🔴 Live Now" : "Upcoming"}
                      </span>
                      {w.is_paid && <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-yellow-500/20 text-yellow-400">Paid</span>}
                      {w.is_recurring && <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400">Recurring</span>}
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-foreground">{w.title}</h3>
                  {w.description && <p className="text-sm text-muted-foreground line-clamp-3">{w.description}</p>}
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <User className="h-3.5 w-3.5" /> {w.coach_name}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{format(new Date(w.webinar_date), "MMM d, yyyy")}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{w.webinar_time.slice(0, 5)}</span>
                    <span>{w.duration_minutes} min</span>
                  </div>
                  {w.is_paid && (
                    <div className="text-sm font-semibold text-yellow-400">
                      ₹{w.price_inr} <span className="text-muted-foreground font-normal">/ ${w.price_usd}</span>
                    </div>
                  )}
                  <div className="pt-3 border-t border-border mt-auto">
                    {registered ? (
                      live && w.webinar_link_status === "approved" ? (
                        <Button size="sm" className="w-full" onClick={async () => {
                          const { data: link } = await supabase.rpc("get_webinar_join_link", { _webinar_id: w.id });
                          if (link) window.open(link as string, "_blank", "noopener,noreferrer");
                          else toast({ title: "Link unavailable", description: "Please refresh and try again." });
                        }}>Join Now</Button>
                      ) : live && w.webinar_link_status !== "approved" ? (
                        <p className="text-sm text-yellow-400">Webinar link is under admin approval. Please wait.</p>
                      ) : (
                        <span className="text-sm text-primary font-medium">✓ Registered</span>
                      )
                    ) : (
                      <Button size="sm" className="w-full" onClick={() => registerForWebinar(w)} disabled={registering === w.id}>
                        {registering === w.id ? "Registering..." : user ? "Register Now" : "Sign in to Register"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Webinars;
