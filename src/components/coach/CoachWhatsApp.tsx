import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle } from "lucide-react";
import WhatsAppOverview from "@/components/coach/whatsapp/WhatsAppOverview";
import WhatsAppCampaigns from "@/components/coach/whatsapp/WhatsAppCampaigns";
import WhatsAppTemplates from "@/components/coach/whatsapp/WhatsAppTemplates";
import WhatsAppContacts from "@/components/coach/whatsapp/WhatsAppContacts";
import FeatureGate from "@/components/shared/FeatureGate";
import { useCoachPlan } from "@/hooks/useCoachPlan";

const CoachWhatsApp = () => {
  const [tab, setTab] = useState("overview");
  const { plan } = useCoachPlan();

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
