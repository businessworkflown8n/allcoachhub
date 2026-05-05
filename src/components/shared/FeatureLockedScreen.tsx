import { Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface Props {
  featureName?: string;
  reason?: string;
  showUpgrade?: boolean;
}

export const FeatureLockedScreen = ({ featureName = "This feature", reason, showUpgrade = true }: Props) => {
  const navigate = useNavigate();
  const isPlanLocked = reason === "plan_locked";
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{featureName} is locked</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {isPlanLocked || showUpgrade
                ? "Upgrade your plan to unlock this feature."
                : "This feature has been disabled by the administrator. Please contact support to request access."}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            {isPlanLocked || showUpgrade ? (
              <Button onClick={() => navigate("/coach/subscription")}>Upgrade Plan</Button>
            ) : null}
            <Button variant="outline" onClick={() => (window.location.href = "mailto:support@aicoachportal.com")}>
              <Mail className="h-4 w-4 mr-2" /> Contact Admin
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeatureLockedScreen;
