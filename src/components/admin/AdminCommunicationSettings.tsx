import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Phone, MessageCircle, Save, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminCommunicationSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({
    chatbot_enabled: "true",
    whatsapp_enabled: "true",
    whatsapp_number: "919852411280",
    whatsapp_message: "Hi, I would like to know more about AI Coach Portal",
    call_enabled: "true",
    call_number: "+919852411280",
  });

  // Role-based visibility
  const [showToLearners, setShowToLearners] = useState(true);
  const [showToCoaches, setShowToCoaches] = useState(true);
  const [promptButtonEnabled, setPromptButtonEnabled] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);


  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const [commRes, platformRes] = await Promise.all([
      supabase.from("communication_settings" as any).select("key, value"),
      supabase.from("platform_settings").select("key, value").in("key", ["show_comm_buttons_learners", "show_comm_buttons_coaches"]),
    ]);
    if (commRes.data) {
      const map: Record<string, string> = {};
      (commRes.data as any[]).forEach(d => { map[d.key] = d.value; });
      setSettings(prev => ({ ...prev, ...map }));
    }
    if (platformRes.data) {
      platformRes.data.forEach((r: any) => {
        if (r.key === "show_comm_buttons_learners") setShowToLearners(r.value === "true");
        if (r.key === "show_comm_buttons_coaches") setShowToCoaches(r.value === "true");
      });
    }
    setLoading(false);
  };

  const saveSettings = async () => {
    setSaving(true);
    for (const [key, value] of Object.entries(settings)) {
      await (supabase.from("communication_settings" as any) as any)
        .update({ value, updated_at: new Date().toISOString() })
        .eq("key", key);
    }
    toast({ title: "Settings saved", description: "Communication settings updated successfully." });
    setSaving(false);
  };

  const saveVisibility = async () => {
    setSavingVisibility(true);
    const upsert = async (key: string, value: string) => {
      const { data } = await supabase.from("platform_settings").select("id").eq("key", key).single();
      if (data) {
        await supabase.from("platform_settings").update({ value }).eq("key", key);
      } else {
        await supabase.from("platform_settings").insert({ key, value });
      }
    };
    await Promise.all([
      upsert("show_comm_buttons_learners", String(showToLearners)),
      upsert("show_comm_buttons_coaches", String(showToCoaches)),
    ]);
    setSavingVisibility(false);
    toast({ title: "Visibility settings saved", description: "Communication visibility updated for Learners & Coaches." });
  };

  const toggle = (key: string) => {
    setSettings(prev => ({ ...prev, [key]: prev[key] === "true" ? "false" : "true" }));
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Communication Settings</h2>
        <Button onClick={saveSettings} disabled={saving}>
          <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Chatbot */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Chatbot</CardTitle>
              </div>
              <Switch checked={settings.chatbot_enabled === "true"} onCheckedChange={() => toggle("chatbot_enabled")} />
            </div>
            <CardDescription>AI-powered chatbot widget on the website</CardDescription>
          </CardHeader>
        </Card>

        {/* WhatsApp */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-[hsl(142,70%,45%)]" />
                <CardTitle className="text-base">WhatsApp Button</CardTitle>
              </div>
              <Switch checked={settings.whatsapp_enabled === "true"} onCheckedChange={() => toggle("whatsapp_enabled")} />
            </div>
            <CardDescription>Floating WhatsApp button for visitors</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">WhatsApp Number (with country code, no +)</Label>
              <Input value={settings.whatsapp_number} onChange={e => setSettings(p => ({ ...p, whatsapp_number: e.target.value }))} placeholder="919852411280" />
            </div>
            <div>
              <Label className="text-xs">Default Message</Label>
              <Input value={settings.whatsapp_message} onChange={e => setSettings(p => ({ ...p, whatsapp_message: e.target.value }))} placeholder="Hi, I would like to know more..." />
            </div>
          </CardContent>
        </Card>

        {/* Call */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Call Button</CardTitle>
              </div>
              <Switch checked={settings.call_enabled === "true"} onCheckedChange={() => toggle("call_enabled")} />
            </div>
            <CardDescription>Floating call button (mobile only)</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label className="text-xs">Phone Number (with country code)</Label>
              <Input value={settings.call_number} onChange={e => setSettings(p => ({ ...p, call_number: e.target.value }))} placeholder="+919852411280" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role-Based Visibility Control */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Users className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Communication Visibility by Role</h3>
        </div>
        <p className="text-xs text-muted-foreground">Control whether communication buttons (Chatbot, WhatsApp, Call) are visible for Learners and Coaches.</p>
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <Label className="text-foreground font-medium">Show Communication to Learners</Label>
              <p className="text-xs text-muted-foreground mt-0.5">When OFF, all communication buttons are hidden for Learners</p>
            </div>
            <Switch checked={showToLearners} onCheckedChange={setShowToLearners} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <Label className="text-foreground font-medium">Show Communication to Coaches</Label>
              <p className="text-xs text-muted-foreground mt-0.5">When OFF, all communication buttons are hidden for Coaches</p>
            </div>
            <Switch checked={showToCoaches} onCheckedChange={setShowToCoaches} />
          </div>
        </div>
        <Button onClick={saveVisibility} disabled={savingVisibility}>
          {savingVisibility ? "Saving..." : "Save Visibility Settings"}
        </Button>
      </div>
    </div>
  );
};

export default AdminCommunicationSettings;
