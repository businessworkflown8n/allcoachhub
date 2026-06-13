import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, Lock, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import WhatsAppOverview from "@/components/coach/whatsapp/WhatsAppOverview";
import WhatsAppCampaigns from "@/components/coach/whatsapp/WhatsAppCampaigns";
import WhatsAppTemplates from "@/components/coach/whatsapp/WhatsAppTemplates";
import WhatsAppContacts from "@/components/coach/whatsapp/WhatsAppContacts";
import FeatureGate from "@/components/shared/FeatureGate";
import { useCoachPlan } from "@/hooks/useCoachPlan";
import { useWhatsAppAccess } from "@/hooks/useWhatsAppAccess";

const CoachWhatsApp = () => {
  const [tab, setTab] = useState("overview");
  const { plan } = useCoachPlan();
  const { hasAccess, loading } = useWhatsAppAccess();

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
            <h2 className="text-xl font-bold text-foreground">WhatsApp Access Not Enabled</h2>
            <p className="text-sm text-muted-foreground">
              Your account currently does not have permission to access the WhatsApp Dashboard.
              Please contact the administrator for access.
            </p>
            <Button asChild variant="default" className="mt-2">
              <a href="mailto:support@aicoachportal.com?subject=Request%20WhatsApp%20Dashboard%20Access">
                <Mail className="h-4 w-4 mr-2" />
                Contact Admin
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
