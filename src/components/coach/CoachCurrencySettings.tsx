import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Globe } from "lucide-react";
import {
  useActiveCurrencies,
  useCoachCurrencySettings,
  useCoachCurrencyRequests,
  useRequestCurrency,
  useUpdateCoachPrimaryCurrency,
} from "@/hooks/useCurrencies";
import { useAuth } from "@/hooks/useAuth";

const CoachCurrencySettings = () => {
  const { user } = useAuth();
  const { data: currencies = [] } = useActiveCurrencies();
  const { data: settings } = useCoachCurrencySettings();
  const { data: requests = [] } = useCoachCurrencyRequests(user?.id);
  const requestCurrency = useRequestCurrency();
  const updatePrimary = useUpdateCoachPrimaryCurrency();

  const [open, setOpen] = useState(false);
  const [requestCode, setRequestCode] = useState("");

  const allowed = settings?.allowed_currencies ?? ["INR"];
  const primary = settings?.primary_currency ?? "INR";
  const allowedDetails = currencies.filter((c) => allowed.includes(c.currency_code));
  const requestable = currencies.filter((c) => !allowed.includes(c.currency_code));

  const handleSubmitRequest = async () => {
    if (!requestCode) return;
    const existing = requests.find((r) => r.requested_currency === requestCode && r.status === "pending");
    if (existing) {
      toast.error("You already have a pending request for this currency");
      return;
    }
    try {
      await requestCurrency.mutateAsync(requestCode);
      toast.success("Request submitted to admin");
      setOpen(false);
      setRequestCode("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handlePrimaryChange = async (code: string) => {
    try {
      await updatePrimary.mutateAsync(code);
      toast.success(`Primary currency set to ${code}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Currency Settings</h2>
        <p className="text-sm text-muted-foreground">
          INR is your default currency. Request access to additional currencies from the admin.
        </p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Primary Currency</div>
            <div className="text-xs text-muted-foreground">Used for new pricing by default</div>
          </div>
          <Select value={primary} onValueChange={handlePrimaryChange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowedDetails.map((c) => (
                <SelectItem key={c.currency_code} value={c.currency_code}>
                  {c.currency_symbol} {c.currency_code} — {c.currency_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-medium">Approved Currencies</div>
            <div className="text-xs text-muted-foreground">Currencies you can price content in</div>
          </div>
          <Button size="sm" onClick={() => setOpen(true)} disabled={requestable.length === 0}>
            <Plus className="mr-2 h-4 w-4" /> Request Currency
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {allowedDetails.map((c) => (
            <Badge key={c.currency_code} variant={c.currency_code === primary ? "default" : "outline"}>
              {c.currency_symbol} {c.currency_code}
              {c.currency_code === primary && " · Primary"}
            </Badge>
          ))}
          {allowedDetails.length === 0 && (
            <Badge variant="outline">₹ INR · Default</Badge>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <div className="text-sm font-medium mb-3">My Requests</div>
        {requests.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-6">
            <Globe className="mx-auto h-8 w-8 mb-2 opacity-50" />
            No requests yet
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border/40">
                <div>
                  <div className="font-medium text-sm">{r.requested_currency}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString()}
                    {r.admin_notes && ` · ${r.admin_notes}`}
                  </div>
                </div>
                <Badge
                  variant={r.status === "pending" ? "secondary" : r.status === "approved" ? "default" : "destructive"}
                >
                  {r.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request New Currency</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select a currency to request from the admin. You'll be notified once approved.
            </p>
            <Select value={requestCode} onValueChange={setRequestCode}>
              <SelectTrigger>
                <SelectValue placeholder="Select a currency" />
              </SelectTrigger>
              <SelectContent>
                {requestable.map((c) => (
                  <SelectItem key={c.currency_code} value={c.currency_code}>
                    {c.currency_symbol} {c.currency_code} — {c.currency_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitRequest} disabled={!requestCode}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CoachCurrencySettings;
