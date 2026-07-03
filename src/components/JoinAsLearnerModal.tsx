import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen, Calendar, Users, Heart, TrendingUp, Award, Sparkles } from "lucide-react";

interface JoinAsLearnerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where to send user after successful signup / login (e.g. `/enroll/<id>`) */
  redirectTo?: string;
  /** Contextual message shown above the benefits. */
  action?: "enroll" | "purchase" | "book" | "membership" | "download" | "premium" | "message" | "default";
}

const ACTION_COPY: Record<string, string> = {
  enroll: "You're one step away from enrolling in this course.",
  purchase: "You're one step away from unlocking this course.",
  book: "You're one step away from booking your session.",
  membership: "You're one step away from joining this membership.",
  download: "You're one step away from downloading this resource.",
  premium: "You're one step away from unlocking this premium lesson.",
  message: "You're one step away from messaging this coach.",
  default: "You're one step away from learning with our expert coaches.",
};

const BENEFITS = [
  { icon: BookOpen, label: "Enroll in courses" },
  { icon: Calendar, label: "Book 1:1 coaching sessions" },
  { icon: Users, label: "Join workshops & events" },
  { icon: Heart, label: "Save favorite coaches" },
  { icon: TrendingUp, label: "Track your learning progress" },
  { icon: Award, label: "Earn certificates" },
];

export const JoinAsLearnerModal = ({
  open,
  onOpenChange,
  redirectTo,
  action = "default",
}: JoinAsLearnerModalProps) => {
  const navigate = useNavigate();
  const redirectParam = redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : "";

  const handleSignup = () => {
    onOpenChange(false);
    navigate(`/signup/learner${redirectParam}`);
  };
  const handleSignin = () => {
    onOpenChange(false);
    navigate(`/auth${redirectParam}`);
  };
  const handleContinue = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border-primary/20">
        <div className="bg-gradient-to-br from-primary/10 via-background to-background p-6">
          <DialogHeader className="text-left space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-widest">Free account</span>
            </div>
            <DialogTitle className="text-2xl font-bold text-foreground">
              Join as a Learner to Continue
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {ACTION_COPY[action]} Create your <strong className="text-foreground">free</strong> learner account to:
            </DialogDescription>
          </DialogHeader>

          <ul className="my-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {BENEFITS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 text-sm text-foreground">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                {label}
              </li>
            ))}
          </ul>

          <div className="space-y-2">
            <Button onClick={handleSignup} className="w-full" size="lg">
              Join as Learner — It's Free
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleSignin} variant="outline" size="sm">
                Sign In
              </Button>
              <Button onClick={handleContinue} variant="ghost" size="sm" className="text-muted-foreground">
                Continue Browsing
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JoinAsLearnerModal;
