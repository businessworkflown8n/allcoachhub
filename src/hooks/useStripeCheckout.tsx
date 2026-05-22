import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StripeEmbeddedCheckout, type StripeCheckoutProps } from "@/components/StripeEmbeddedCheckout";

export function useStripeCheckout() {
  const [options, setOptions] = useState<StripeCheckoutProps | null>(null);
  const [title, setTitle] = useState<string>("Complete payment");

  const openCheckout = useCallback((opts: StripeCheckoutProps, dialogTitle?: string) => {
    setOptions(opts);
    if (dialogTitle) setTitle(dialogTitle);
  }, []);

  const closeCheckout = useCallback(() => setOptions(null), []);

  const checkoutDialog = (
    <Dialog open={!!options} onOpenChange={(o) => !o && closeCheckout()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {options && <StripeEmbeddedCheckout {...options} />}
      </DialogContent>
    </Dialog>
  );

  return { openCheckout, closeCheckout, isOpen: !!options, checkoutDialog };
}
