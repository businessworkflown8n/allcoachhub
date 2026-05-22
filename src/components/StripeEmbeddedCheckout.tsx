import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";

export type CheckoutMode = "subscription" | "course" | "webinar";

export interface StripeCheckoutProps {
  mode: CheckoutMode;
  returnUrl?: string;
  // subscription
  priceId?: string;
  // one-off
  itemId?: string;
  itemTitle?: string;
  amount?: number;
  currency?: "INR" | "USD";
  enrollmentId?: string;
  // user
  customerEmail?: string;
  userId?: string;
}

export function StripeEmbeddedCheckout(props: StripeCheckoutProps) {
  const returnUrl = props.returnUrl
    || `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`;

  const fetchClientSecret = async (): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: {
        mode: props.mode,
        environment: getStripeEnvironment(),
        returnUrl,
        priceId: props.priceId,
        itemId: props.itemId,
        itemTitle: props.itemTitle,
        amount: props.amount,
        currency: props.currency,
        enrollmentId: props.enrollmentId,
        customerEmail: props.customerEmail,
        userId: props.userId,
      },
    });
    if (error || !data?.clientSecret) {
      throw new Error((error as any)?.message || "Failed to start checkout");
    }
    return data.clientSecret as string;
  };

  return (
    <div id="stripe-checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
