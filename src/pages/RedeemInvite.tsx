import { useEffect, useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSEO } from "@/hooks/useSEO";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const RedeemInvite = () => {
  const { token } = useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");
  const [courseId, setCourseId] = useState<string | null>(null);

  useSEO({ title: "Redeem Invite", noIndex: true });

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (!token) {
      setStatus("error");
      setMessage("Missing invite token");
      return;
    }
    (async () => {
      const { data, error } = await supabase.rpc("redeem_course_invite", { _token: token });
      if (error) {
        setStatus("error");
        setMessage(error.message || "Could not redeem invite");
        return;
      }
      const cid = (data as any)?.course_id;
      setCourseId(cid);
      setStatus("success");
      setMessage("Access granted! Redirecting to your course...");
      setTimeout(() => navigate(`/learn/${cid}`), 1500);
    })();
  }, [user, authLoading, token, navigate]);

  if (authLoading) return <div className="grid min-h-screen place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!user) return <Navigate to={`/auth?mode=signup&redirect=/invite/${token}`} replace />;

  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <div className="rounded-2xl border border-border bg-card p-8 max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin mb-3" />
            <h2 className="text-xl font-bold">Redeeming your invite…</h2>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="h-10 w-10 mx-auto text-primary mb-3" />
            <h2 className="text-xl font-bold">You're in!</h2>
            <p className="text-sm text-muted-foreground mt-2">{message}</p>
            {courseId && (
              <Button className="mt-4" onClick={() => navigate(`/learn/${courseId}`)}>Go to course</Button>
            )}
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-10 w-10 mx-auto text-destructive mb-3" />
            <h2 className="text-xl font-bold">Invite issue</h2>
            <p className="text-sm text-muted-foreground mt-2">{message}</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>Back to home</Button>
          </>
        )}
      </div>
    </div>
  );
};

export default RedeemInvite;
