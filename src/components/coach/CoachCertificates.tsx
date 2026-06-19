import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Award, Download, Search, ShieldOff, RefreshCw, Loader2, Plus } from "lucide-react";

const CoachCertificates = () => {
  const { user } = useAuth();
  const [certs, setCerts] = useState<any[]>([]);
  const [completed, setCompleted] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [certRes, enrRes] = await Promise.all([
      supabase.from("issued_certificates").select("*").eq("coach_id", user.id).order("created_at", { ascending: false }),
      supabase.from("enrollments").select("id, learner_id, course_id, progress_percent, completed_at, full_name, courses(title, coach_id)").eq("coach_id", user.id).gte("progress_percent", 100),
    ]);
    setCerts(certRes.data || []);
    setCompleted((enrRes.data || []).filter((e: any) => e.courses?.coach_id === user.id));
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const issuedKey = useMemo(() => new Set(certs.map((c) => `${c.source_type}:${c.source_id}:${c.user_id}`)), [certs]);

  const issue = async (e: any) => {
    setIssuing(e.id);
    try {
      const { data, error } = await supabase.functions.invoke("issue-certificate", {
        body: { source_type: "course", source_id: e.course_id, learner_id: e.learner_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "Certificate issued", description: data.certificate_number });
      await load();
    } catch (err: any) {
      toast({ title: err.message || "Failed to issue", variant: "destructive" });
    } finally {
      setIssuing(null);
    }
  };

  const revoke = async (id: string) => {
    const reason = prompt("Reason for revocation?");
    if (!reason) return;
    const { error } = await supabase.rpc("revoke_certificate", { _certificate_id: id, _reason: reason });
    if (error) return toast({ title: error.message, variant: "destructive" });
    toast({ title: "Certificate revoked" });
    load();
  };

  const filtered = certs.filter((c) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (c.learner_name || "").toLowerCase().includes(s) || (c.course_name || "").toLowerCase().includes(s) || (c.certificate_number || "").toLowerCase().includes(s);
  });

  const pending = completed.filter((e) => !issuedKey.has(`course:${e.course_id}:${e.learner_id}`));

  if (loading) return <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mt-8" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Certificates</h2>
          <p className="text-sm text-muted-foreground">Issue and manage course completion certificates.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Total Issued" value={certs.length} />
          <Stat label="Pending" value={pending.length} />
        </div>
      </div>

      {/* Pending issuance */}
      {pending.length > 0 && (
        <section className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <h3 className="text-sm font-bold text-foreground mb-3">Ready to Issue ({pending.length})</h3>
          <div className="space-y-2">
            {pending.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 rounded-lg bg-background p-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{e.full_name || "Learner"}</p>
                  <p className="text-xs text-muted-foreground truncate">{e.courses?.title} · 100% complete</p>
                </div>
                <button onClick={() => issue(e)} disabled={issuing === e.id} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">
                  {issuing === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Issue Certificate
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by learner, course, or certificate number" className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm" />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Award className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No certificates issued yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Learner</th>
                <th className="p-3 text-left">Course</th>
                <th className="p-3 text-left">Cert No.</th>
                <th className="p-3 text-left">Issued</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="p-3 text-foreground">{c.learner_name}</td>
                  <td className="p-3 text-foreground">{c.course_name}</td>
                  <td className="p-3 text-foreground text-xs font-mono">{c.certificate_number}</td>
                  <td className="p-3 text-muted-foreground">{new Date(c.issued_at).toLocaleDateString()}</td>
                  <td className="p-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${c.status === "valid" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-2">
                      {c.pdf_url && (
                        <a href={c.pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <Download className="h-3 w-3" /> PDF
                        </a>
                      )}
                      <a href={`/verify-certificate/${c.verification_token}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline">
                        <RefreshCw className="h-3 w-3" /> Verify
                      </a>
                      {c.status === "valid" && (
                        <button onClick={() => revoke(c.id)} className="inline-flex items-center gap-1 text-xs text-destructive hover:underline">
                          <ShieldOff className="h-3 w-3" /> Revoke
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg border border-border bg-card px-4 py-2 text-center">
    <div className="text-xl font-bold text-foreground">{value}</div>
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
  </div>
);

export default CoachCertificates;
