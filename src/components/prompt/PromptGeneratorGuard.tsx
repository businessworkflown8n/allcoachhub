import { ReactNode, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Lock, Clock, ShieldAlert, XCircle, AlertTriangle } from "lucide-react";

type Reason =
  | "not_authenticated"
  | "not_registered"
  | "invalid_role"
  | "pending_approval"
  | "suspended"
  | "rejected"
  | "feature_disabled"
  | "subscription_inactive"
  | "allowed"
  | "admin"
  | "error";

interface Props {
  children: ReactNode;
}

const PromptGeneratorGuard = ({ children }: Props) => {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState<Reason>("not_authenticated");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setReason("not_authenticated");
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase.rpc("check_prompt_generator_access", { _user_id: user.id });
      if (error) {
        setReason("error");
      } else {
        const r = (data as any)?.reason as Reason;
        setReason(r || "error");
      }
      setLoading(false);
    })();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-2xl py-16 px-4">
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (reason === "allowed" || reason === "admin") return <>{children}</>;

  const config: Record<string, { icon: any; title: string; message: string; cta?: ReactNode }> = {
    not_authenticated: {
      icon: Lock,
      title: "Sign in required",
      message: "Please sign up as a Coach or Learner to access the AI Prompt Generator.",
      cta: (
        <div className="flex gap-2 justify-center">
          <Link to="/signup"><Button>Sign up</Button></Link>
          <Link to="/login"><Button variant="outline">Log in</Button></Link>
        </div>
      ),
    },
    not_registered: {
      icon: AlertTriangle,
      title: "Complete your registration",
      message: "Your account setup is incomplete. Please finish signing up as a Coach or Learner.",
      cta: <Link to="/signup"><Button>Complete signup</Button></Link>,
    },
    invalid_role: {
      icon: ShieldAlert,
      title: "Access not available",
      message: "The AI Prompt Generator is only available to Coach and Learner accounts.",
    },
    pending_approval: {
      icon: Clock,
      title: "Waiting for Admin Approval",
      message: "Your account is under review. You'll get access to the AI Prompt Generator once an administrator approves your registration.",
    },
    suspended: {
      icon: XCircle,
      title: "Account suspended",
      message: "Your account is currently suspended. Please contact the administrator to restore access.",
    },
    rejected: {
      icon: XCircle,
      title: "Access denied",
      message: "Your account registration was not approved. Please contact the administrator for details.",
    },
    feature_disabled: {
      icon: Lock,
      title: "Prompt Generator not enabled",
      message: "Prompt Generator is not enabled for your account. Please contact the Admin or upgrade your plan.",
    },
    subscription_inactive: {
      icon: Lock,
      title: "Subscription inactive",
      message: "Your subscription is not active. Please renew or upgrade your plan to access the AI Prompt Generator.",
    },
    error: {
      icon: AlertTriangle,
      title: "Something went wrong",
      message: "We couldn't verify your access. Please try again in a moment.",
    },
  };

  const c = config[reason] ?? config.error;
  const Icon = c.icon;

  return (
    <div className="mx-auto max-w-xl py-16 px-4">
      <Card>
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Icon className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">{c.title}</h1>
          <p className="text-muted-foreground">{c.message}</p>
          {c.cta && <div className="pt-2">{c.cta}</div>}
        </CardContent>
      </Card>
    </div>
  );
};

export default PromptGeneratorGuard;
