import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Award, Download, ShieldCheck, Linkedin, Copy, Sparkles, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  cert: any | null;
  onClose: () => void;
}

const CertificateShareModal = ({ cert, onClose }: Props) => {
  const [generating, setGenerating] = useState(false);
  const [post, setPost] = useState("");

  if (!cert) return null;
  const verifyUrl = `${window.location.origin}/verify-certificate/${cert.verification_token}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(verifyUrl);
    toast({ title: "Verification link copied" });
  };

  const copyPost = async () => {
    await navigator.clipboard.writeText(post);
    toast({ title: "Post copied — paste it into LinkedIn" });
  };

  const generatePost = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-linkedin-post", {
        body: { certificate_id: cert.id },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      setPost((data as any).post || "");
    } catch (e: any) {
      toast({ title: "AI generation failed", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const shareOnLinkedIn = () => {
    // Open LinkedIn share dialog with verify URL; user pastes the AI post into their share box.
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`;
    if (post) {
      navigator.clipboard.writeText(post).then(() => {
        toast({ title: "Post copied!", description: "Paste it in the LinkedIn share dialog." });
      }).catch(() => {});
    }
    window.open(shareUrl, "_blank", "noopener,noreferrer,width=720,height=720");
  };

  const addToLinkedInProfile = () => {
    const issueDate = new Date(cert.issued_at);
    const params = new URLSearchParams({
      startTask: "CERTIFICATION_NAME",
      name: cert.course_name || "AI Coach Portal Certificate",
      organizationName: "AI Coach Portal",
      issueYear: String(issueDate.getFullYear()),
      issueMonth: String(issueDate.getMonth() + 1),
      certUrl: verifyUrl,
      certId: cert.certificate_number || "",
    });
    window.open(`https://www.linkedin.com/profile/add?${params.toString()}`, "_blank");
  };

  return (
    <Dialog open={!!cert} onOpenChange={(o) => { if (!o) { onClose(); setPost(""); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" /> Share Your Achievement
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-primary/40 bg-gradient-to-br from-[#0a1219] to-[#050A0F] p-5">
            <p className="text-xs uppercase tracking-wider text-primary font-bold">Certificate</p>
            <h3 className="mt-1 text-lg font-bold text-white">{cert.course_name}</h3>
            <p className="mt-1 text-xs text-white/60 font-mono">{cert.certificate_number}</p>
            <p className="mt-1 text-xs text-white/60">Awarded to {cert.learner_name} by {cert.coach_name}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {cert.pdf_url && (
              <a href={cert.pdf_url} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm" className="gap-2"><Download className="h-3.5 w-3.5" /> Download PDF</Button>
              </a>
            )}
            <Button variant="outline" size="sm" className="gap-2" onClick={copyLink}>
              <Copy className="h-3.5 w-3.5" /> Copy Verify Link
            </Button>
            <a href={`/verify-certificate/${cert.verification_token}`} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="gap-2"><ShieldCheck className="h-3.5 w-3.5" /> Verify</Button>
            </a>
            <Button variant="outline" size="sm" className="gap-2" onClick={addToLinkedInProfile}>
              <Linkedin className="h-3.5 w-3.5" /> Add to LinkedIn Profile
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> AI LinkedIn Post Generator
                </p>
                <p className="text-xs text-muted-foreground">A unique, professional, positive post — fully editable before you share.</p>
              </div>
              <Button size="sm" onClick={generatePost} disabled={generating}>
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                {post ? "Regenerate" : "Generate Post"}
              </Button>
            </div>
            {post && (
              <>
                <Textarea value={post} onChange={(e) => setPost(e.target.value)} rows={12} className="font-sans text-sm" />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="gap-2" onClick={copyPost}>
                    <Copy className="h-3.5 w-3.5" /> Copy Post
                  </Button>
                  <Button size="sm" className="gap-2 bg-[#0A66C2] hover:bg-[#0A66C2]/90 text-white" onClick={shareOnLinkedIn}>
                    <Linkedin className="h-3.5 w-3.5" /> Share on LinkedIn
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CertificateShareModal;
