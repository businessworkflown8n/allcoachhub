import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Award, Download, ShieldCheck, Share2, Linkedin, Loader2, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import CertificateShareModal from "./CertificateShareModal";

const LearnerCertificates = () => {
  const { user } = useAuth();
  const [certs, setCerts] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "course" | "webinar">("all");
  const [shareCert, setShareCert] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("issued_certificates")
        .select("*")
        .eq("user_id", user.id)
        .order("issued_at", { ascending: false });
      setCerts(data || []);
      setLoading(false);
    })();
  }, [user]);

  const share = async (c: any) => {
    const url = `${window.location.origin}/verify-certificate/${c.verification_token}`;
    const text = `I just earned a certificate for "${c.course_name}" on AI Coach Portal!`;
    if (navigator.share) {
      await navigator.share({ title: c.course_name, text, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Verification link copied" });
    }
  };

  const linkedInAdd = (c: any) => {
    const issueDate = new Date(c.issued_at);
    const params = new URLSearchParams({
      startTask: "CERTIFICATION_NAME",
      name: c.course_name || "AI Coach Portal Certificate",
      organizationName: "AI Coach Portal",
      issueYear: String(issueDate.getFullYear()),
      issueMonth: String(issueDate.getMonth() + 1),
      certUrl: `${window.location.origin}/verify-certificate/${c.verification_token}`,
      certId: c.certificate_number || "",
    });
    window.open(`https://www.linkedin.com/profile/add?${params.toString()}`, "_blank");
  };

  if (loading) return <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mt-8" />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-foreground">My Certificates</h2>
        <p className="text-sm text-muted-foreground">Download, share, and verify your course completion certificates.</p>
      </div>

      {certs.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Award className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground">No certificates yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Complete a course and your coach will issue your certificate.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {certs.map((c) => (
            <div key={c.id} className={`group relative overflow-hidden rounded-xl border p-5 ${c.status === "valid" ? "border-primary/40 bg-gradient-to-br from-[#0a1219] to-[#050A0F]" : "border-destructive/40 bg-card opacity-75"}`}>
              <div className="absolute inset-0 pointer-events-none opacity-20" style={{ background: "radial-gradient(circle at 80% 20%, rgba(199,255,61,0.25), transparent 60%)" }} />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <Award className="h-7 w-7 text-[#C7FF3D]" />
                  <span className={`text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 ${c.status === "valid" ? "bg-[#C7FF3D]/15 text-[#C7FF3D]" : "bg-destructive/15 text-destructive"}`}>
                    {c.status}
                  </span>
                </div>
                <h3 className="mt-3 text-base font-bold text-white line-clamp-2">{c.course_name}</h3>
                <p className="mt-1 text-xs text-white/60 font-mono">{c.certificate_number}</p>
                <p className="mt-1 text-xs text-white/50">Issued {new Date(c.issued_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</p>
                <p className="mt-1 text-xs text-white/60">by {c.coach_name}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {c.pdf_url && (
                    <a href={c.pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md bg-[#C7FF3D] px-3 py-1.5 text-xs font-bold text-[#050A0F]">
                      <Download className="h-3 w-3" /> PDF
                    </a>
                  )}
                  <button onClick={() => share(c)} className="inline-flex items-center gap-1 rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/5">
                    <Share2 className="h-3 w-3" /> Share
                  </button>
                  <button onClick={() => linkedInAdd(c)} className="inline-flex items-center gap-1 rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/5">
                    <Linkedin className="h-3 w-3" /> LinkedIn
                  </button>
                  <a href={`/verify-certificate/${c.verification_token}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/5">
                    <ShieldCheck className="h-3 w-3" /> Verify
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LearnerCertificates;
