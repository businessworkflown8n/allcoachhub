import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Lock, Mail, ExternalLink, Copy, Eye, EyeOff, KeyRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import WhatsAppOverview from "@/components/coach/whatsapp/WhatsAppOverview";
import WhatsAppCampaigns from "@/components/coach/whatsapp/WhatsAppCampaigns";
import WhatsAppTemplates from "@/components/coach/whatsapp/WhatsAppTemplates";
import WhatsAppContacts from "@/components/coach/whatsapp/WhatsAppContacts";
import FeatureGate from "@/components/shared/FeatureGate";
import { useCoachPlan } from "@/hooks/useCoachPlan";
import { useWhatsAppAccess } from "@/hooks/useWhatsAppAccess";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const DEFAULT_LOGIN_URL = "https://login.digitalsms.biz/signin.php";

interface Creds {
  login_url: string;
  user_id: string | null;
  password: string | null;
}

const CoachWhatsApp = () => {
  const [tab, setTab] = useState("overview");
  const { plan } = useCoachPlan();
  const { hasAccess, loading } = useWhatsAppAccess();
  const { user } = useAuth();
  const [creds, setCreds] = useState<Creds | null>(null);
  const [credsLoading, setCredsLoading] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!user || !hasAccess) {
      setCredsLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("whatsapp_credentials")
        .select("login_url, user_id, password")
        .eq("coach_id", user.id)
        .maybeSingle();
      setCreds(
        data
          ? { login_url: data.login_url || DEFAULT_LOGIN_URL, user_id: data.user_id, password: data.password }
          : { login_url: DEFAULT_LOGIN_URL, user_id: null, password: null }
      );
      setCredsLoading(false);
    })();
  }, [user, hasAccess]);

  const copyCreds = async () => {
    if (!creds?.user_id || !creds?.password) return;
    await navigator.clipboard.writeText(`URL: ${creds.login_url}\nUser ID: ${creds.user_id}\nPassword: ${creds.password}`);
    toast({ title: "Copied", description: "Credentials copied to clipboard." });
  };

  const requestCredentials = async () => {
    if (!user) return;
    setRequesting(true);
    const { error } = await supabase.from("whatsapp_credential_requests").insert({ coach_id: user.id, status: "pending" });
    setRequesting(false);
    if (error) {
      toast({ title: "Request failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Request sent", description: "Admin has been notified." });
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <Card className="max-w-md w-full border-amber-200/30">
          <CardContent className="pt-10 pb-8 text-center space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Lock className="h-8 w-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-foreground">WhatsApp Automation is Locked</h2>
            <p className="text-sm text-muted-foreground">
              Your account currently does not have permission to access the WhatsApp Dashboard.
              Please contact the administrator for access.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button asChild variant="default">
                <a href="mailto:support@aicoachportal.com?subject=Request%20WhatsApp%20Dashboard%20Access">
                  <Mail className="h-4 w-4 mr-2" /> Contact Admin
                </a>
              </Button>
              <Button variant="outline" onClick={requestCredentials} disabled={requesting}>
                <KeyRound className="h-4 w-4 mr-2" /> {requesting ? "Sending..." : "Request Access"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dashboardPanel = (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" /> WhatsApp Dashboard Access
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {credsLoading ? (
          <p className="text-sm text-muted-foreground">Loading credentials...</p>
        ) : creds?.user_id && creds?.password ? (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Login URL</Label>
                <Input readOnly value={creds.login_url} />
              </div>
              <div>
                <Label className="text-xs">User ID</Label>
                <Input readOnly value={creds.user_id} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Password</Label>
                <div className="relative">
                  <Input readOnly type={showPw ? "text" : "password"} value={creds.password} />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={copyCreds} variant="outline">
                <Copy className="h-4 w-4 mr-2" /> Copy Credentials
              </Button>
              <Button asChild>
                <a href={creds.login_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" /> Launch WhatsApp Dashboard
                </a>
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your WhatsApp access is enabled, but credentials have not been issued yet. Request them from the admin.
            </p>
            <Button onClick={requestCredentials} disabled={requesting}>
              <KeyRound className="h-4 w-4 mr-2" /> {requesting ? "Sending..." : "Request Login Credentials"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <FeatureGate featureKey="whatsapp_automation" featureName="WhatsApp Automation" plan={plan}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold text-foreground">WhatsApp Campaigns</h2>
            <p className="text-sm text-muted-foreground">Manage campaigns, templates, and contacts</p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="contacts">Contacts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><WhatsAppOverview /></TabsContent>
          <TabsContent value="campaigns"><WhatsAppCampaigns /></TabsContent>
          <TabsContent value="templates"><WhatsAppTemplates /></TabsContent>
          <TabsContent value="contacts"><WhatsAppContacts /></TabsContent>
        </Tabs>
      </div>
    </FeatureGate>
  );
};

export default CoachWhatsApp;
