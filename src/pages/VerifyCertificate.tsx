import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/hooks/useSEO";
import { ShieldCheck, ShieldAlert, Loader2, Award, ExternalLink } from "lucide-react";

interface VerifyData {
  found: boolean;
  certificate_number?: string;
  learner_name?: string;
  course_name?: string;
  coach_name?: string;
  coach_designation?: string;
  coach_organization?: string;
  issued_at?: string;
  completion_date?: string;
  duration_text?: string;
  status?: string;
  source_type?: string;
}

const VerifyCertificate = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<VerifyData | null>(null);
  const [loading, setLoading] = useState(true);

  useSEO({
    title: "Verify Certificate – AI Coach Portal",
    description: "Verify the authenticity of an AI Coach Portal certificate.",
    canonical: `https://www.aicoachportal.com/verify-certificate/${token}`,
  });

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-certificate", { body: { token } });
        if (error) throw error;
        setData(data);
      } catch {
        setData({ found: false });
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const isValid = data?.found && data.status === "valid";
  const isRevoked = data?.found && data.status === "revoked";

  return (
    <div className="min-h-screen bg-[#050A0F] text-white">
      <header className="border-b border-[#C7FF3D]/20 py-4 px-6 flex items-center gap-3">
        <Award className="h-6 w-6 text-[#C7FF3D]" />
        <span className="font-bold">AI Coach Portal</span>
        <span className="ml-auto text-xs text-white/60">Certificate Verification</span>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {loading ? (
          <div className="text-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-[#C7FF3D] mx-auto" />
            <p className="mt-4 text-white/70">Verifying certificate…</p>
          </div>
        ) : !data?.found ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-10 text-center">
            <ShieldAlert className="h-14 w-14 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Certificate Not Found</h1>
            <p className="mt-2 text-white/70">This verification link does not match any issued certificate.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#C7FF3D]/40 bg-[#0a1219] p-8 sm:p-10 shadow-[0_0_60px_-15px_rgba(199,255,61,0.25)]">
            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ${isValid ? "bg-[#C7FF3D]/15 text-[#C7FF3D] border border-[#C7FF3D]/40" : "bg-red-500/15 text-red-400 border border-red-500/40"}`}>
              {isValid ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
              {isValid ? "Valid Certificate" : "Revoked"}
            </div>

            <h1 className="mt-6 text-3xl sm:text-4xl font-bold tracking-tight">{data.learner_name}</h1>
            <p className="mt-2 text-white/70">has successfully completed</p>
            <h2 className="mt-1 text-xl sm:text-2xl font-bold text-[#C7FF3D]">{data.course_name}</h2>

            <dl className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
              <Field label="Certificate No." value={data.certificate_number} />
              <Field label="Issued On" value={data.issued_at ? new Date(data.issued_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"} />
              <Field label="Coach" value={data.coach_name} />
              <Field label="Designation" value={`${data.coach_designation || "—"}${data.coach_organization ? " · " + data.coach_organization : ""}`} />
              {data.duration_text && <Field label="Duration" value={data.duration_text} />}
              <Field label="Type" value={data.source_type?.replace("_", " ")} />
            </dl>

            {isRevoked && (
              <p className="mt-6 text-sm text-red-300/80">This certificate has been revoked by the issuing coach or platform admin.</p>
            )}

            <a
              href="https://www.aicoachportal.com"
              className="mt-8 inline-flex items-center gap-2 text-sm text-[#C7FF3D] hover:underline"
            >
              Visit AI Coach Portal <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </main>
    </div>
  );
};

const Field = ({ label, value }: { label: string; value?: string }) => (
  <div>
    <dt className="text-xs uppercase tracking-wider text-white/50">{label}</dt>
    <dd className="mt-1 text-white capitalize">{value || "—"}</dd>
  </div>
);

export default VerifyCertificate;
