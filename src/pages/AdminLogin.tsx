import { useState } from "react";
import { useSEO } from "@/hooks/useSEO";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const AdminLogin = () => {
  useSEO({
    title: "Admin Login – AI Coach Portal",
    description: "Secure admin login for AI Coach Portal administrators.",
    canonical: "https://www.aicoachportal.com/admin/login",
    noIndex: true,
  });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  if (authLoading || (user && roleLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user && role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      return;
    }

    // Verify admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .single();

    if (roleData?.role !== "admin") {
      await supabase.auth.signOut();
      setLoading(false);
      toast({ title: "Access denied", description: "This login is for administrators only.", variant: "destructive" });
      return;
    }

    setLoading(false);
    window.location.href = "/admin";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-destructive/10">
            <Shield className="h-7 w-7 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Admin Portal</h1>
          <p className="mt-2 text-sm text-muted-foreground">Restricted access — administrators only</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="admin-email" className="text-foreground">Admin Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@aicoachportal.com"
                required
                className="bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password" className="text-foreground">Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
                className="bg-secondary border-border"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-3 font-semibold text-destructive-foreground transition-all hover:brightness-110 disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Admin Sign In"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        </div>

        <div className="mt-6 space-y-2 text-center text-xs text-muted-foreground">
          <p>
            Login via OTP? <a href="/admin/otp-login" className="text-primary hover:underline">Admin OTP Login</a>
          </p>
          <p>
            Not an admin? <a href="/auth" className="text-primary hover:underline">Go to regular login</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
