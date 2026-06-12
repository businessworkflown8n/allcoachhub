import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import PromptGeneratorForm from "./PromptGeneratorForm";

const FloatingPromptButton = () => {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "prompt_button_enabled")
      .maybeSingle()
      .then(({ data }) => setEnabled(data?.value === "true"));
  }, []);

  if (!enabled) return null;


  const trigger = (
    <button
      onClick={() => setOpen(true)}
      className="fixed right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/20 text-primary shadow-lg backdrop-blur-md transition-all hover:scale-110 hover:bg-primary/30 md:bottom-24 bottom-24"
      aria-label="Generate Prompt"
    >
      <Sparkles className="h-5 w-5" />
    </button>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Quick Prompt Generator
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <PromptGeneratorForm compact />
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Quick Prompt Generator
            </DialogTitle>
          </DialogHeader>
          <PromptGeneratorForm compact />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FloatingPromptButton;
