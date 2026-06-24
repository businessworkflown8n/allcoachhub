import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Video, Calendar, Clock, ExternalLink, User, Award, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CertificateShareModal from "./CertificateShareModal";

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
  cert_enabled?: boolean;
}

const LearnerWebinars = () => {
  const { user } = useAuth();
  const [allWebinars, setAllWebinars] = useState<WebinarWithCoach[]>([]);
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set());
  const [attendedIds, setAttendedIds] = useState<Set<string>>(new Set());
  const [certByWebinar, setCertByWebinar] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const [issuing, setIssuing] = useState<string | null>(null);
  const [shareCert, setShareCert] = useState<any | null>(null);

  const loadCerts = async (uid: string) => {
    const { data } = await supabase
      .from("issued_certificates")
      .select("*")
      .eq("user_id", uid)
      .eq("source_type", "webinar");
    const map: Record<string, any> = {};
    (data || []).forEach((c: any) => { if (c.webinar_id) map[c.webinar_id] = c; });
    setCertByWebinar(map);
  };

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: webinars } = await supabase
        .from("webinars")
        .select("*")
        .eq("is_published", true)
        .order("webinar_date", { ascending: true });

      const coachIds = [...new Set((webinars || []).map((w: any) => w.coach_id))];
      let coachMap = new Map<string, string>();
      if (coachIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", coachIds);
        (profiles || []).forEach((p: any) => coachMap.set(p.user_id, p.full_name || "Coach"));
      }

      setAllWebinars((webinars || []).map((w: any) => ({
        ...w,
        coach_name: coachMap.get(w.coach_id) || "Coach",
      })));

      const { data: regs } = await supabase
        .from("webinar_registrations")
        .select("webinar_id, attended")
        .eq("learner_id", user.id);
      setRegisteredIds(new Set((regs || []).map((r: any) => r.webinar_id)));
      setAttendedIds(new Set((regs || []).filter((r: any) => r.attended).map((r: any) => r.webinar_id)));

      await loadCerts(user.id);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const registerForWebinar = async (webinar: WebinarWithCoach) => {
    if (!user) return;
    setRegistering(webinar.id);

    const { error } = await supabase.from("webinar_registrations").insert({
      webinar_id: webinar.id,
      learner_id: user.id,
    });

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

  const generateCertificate = async (w: WebinarWithCoach) => {
    if (!user) return;
    setIssuing(w.id);
    try {
      const { data, error } = await supabase.functions.invoke("issue-certificate", {
        body: { source_type: "webinar", source_id: w.id, learner_id: user.id },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message || "Failed");
      toast({ title: "Certificate ready!" });
      await loadCerts(user.id);
      // Fetch the cert to open share modal
      const { data: cert } = await supabase.from("issued_certificates")
        .select("*").eq("id", (data as any).id).maybeSingle();
      if (cert) setShareCert(cert);
    } catch (e: any) {
      toast({ title: "Could not generate certificate", description: e.message, variant: "destructive" });
    } finally {
      setIssuing(null);
    }
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

  const upcoming = allWebinars.filter((w) => getEndTime(w) >= now);
  const myUpcoming = upcoming.filter((w) => registeredIds.has(w.id));
  const myPast = allWebinars.filter((w) => getEndTime(w) < now && registeredIds.has(w.id));

  if (loading) return <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mt-8" />;

  const CertificateBlock = ({ w }: { w: WebinarWithCoach }) => {
    const cert = certByWebinar[w.id];
    if (!w.cert_enabled) return null;
    if (cert) {
      return (
        <Button size="sm" variant="outline" className="w-full gap-2 border-primary/40 text-primary" onClick={() => setShareCert(cert)}>
          <Award className="h-3 w-3" /> View Certificate
        </Button>
      );
    }
    if (!attendedIds.has(w.id)) {
      return <p className="text-xs text-muted-foreground">Certificate available after attendance is confirmed.</p>;
    }
    return (
      <Button size="sm" className="w-full gap-2" disabled={issuing === w.id} onClick={() => generateCertificate(w)}>
        {issuing === w.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Award className="h-3 w-3" />}
        {issuing === w.id ? "Generating…" : "🎓 Generate Certificate"}
      </Button>
    );
  };

  const WebinarCard = ({ w, showRegister = false, showJoin = false, showCert = false }: { w: WebinarWithCoach; showRegister?: boolean; showJoin?: boolean; showCert?: boolean }) => {
    const live = isLive(w);
    const isPast = getEndTime(w) < now;
    return (
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className={`rounded-full px-2 py-0.5 text-xs ${isPast ? "bg-muted text-muted-foreground" : live ? "bg-green-500/20 text-green-400" : "bg-primary/20 text-primary"}`}>
            {isPast ? "Completed" : live ? "🔴 Live Now" : "Upcoming"}
          </span>
          {w.is_paid && <span className="rounded-full px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400">₹{w.price_inr}</span>}
        </div>
        <h3 className="text-sm font-bold text-foreground">{w.title}</h3>
        {w.description && <p className="text-xs text-muted-foreground line-clamp-2">{w.description}</p>}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <User className="h-3 w-3" /> {w.coach_name}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(w.webinar_date), "MMM d, yyyy")}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{w.webinar_time.slice(0, 5)}</span>
          <span>{w.duration_minutes} min</span>
        </div>
        <div className="pt-2 border-t border-border space-y-2">
          {showRegister && !registeredIds.has(w.id) && (
            <Button size="sm" onClick={() => registerForWebinar(w)} disabled={registering === w.id} className="w-full">
              {registering === w.id ? "Registering..." : "Register"}
            </Button>
          )}
          {showRegister && registeredIds.has(w.id) && (
            <span className="text-xs text-primary font-medium">✓ Registered</span>
          )}
          {showJoin && live && w.webinar_link_status === "approved" && (
            <a href={w.webinar_link} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="w-full gap-2"><ExternalLink className="h-3 w-3" /> Join Now</Button>
            </a>
          )}
          {showJoin && live && w.webinar_link_status !== "approved" && (
            <p className="text-xs text-yellow-400">Webinar link is under admin approval. Please wait.</p>
          )}
          {showJoin && !live && !isPast && (
            <p className="text-xs text-muted-foreground">Join button activates at start time</p>
          )}
          {showCert && <CertificateBlock w={w} />}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Webinars</h2>

      <Tabs defaultValue="browse">
        <TabsList>
          <TabsTrigger value="browse">Browse Webinars</TabsTrigger>
          <TabsTrigger value="my-upcoming">My Upcoming ({myUpcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Completed ({myPast.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="mt-4">
          {upcoming.length === 0 ? (
            <div className="text-center py-16">
              <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground">No upcoming webinars</h3>
              <p className="text-sm text-muted-foreground">Check back later for new webinars</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((w) => <WebinarCard key={w.id} w={w} showRegister />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-upcoming" className="mt-4">
          {myUpcoming.length === 0 ? (
            <div className="text-center py-16">
              <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">You haven't registered for any upcoming webinars</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myUpcoming.map((w) => <WebinarCard key={w.id} w={w} showJoin />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-4">
          {myPast.length === 0 ? (
            <div className="text-center py-16">
              <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">No past webinars</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myPast.map((w) => <WebinarCard key={w.id} w={w} showCert />)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CertificateShareModal cert={shareCert} onClose={() => setShareCert(null)} />
    </div>
  );
};

export default LearnerWebinars;
