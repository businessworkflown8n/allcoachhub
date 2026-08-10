import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

const RAZORPAY_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/** Extracts the real, structured error the Edge Function returned.
 *  supabase-js throws FunctionsHttpError with a generic message
 *  ("Edge Function returned a non-2xx status code") and keeps the actual
 *  response on `error.context`. We read that body so the user sees the truth. */
async function extractFunctionError(error: any, data: any): Promise<{ message: string; code?: string }> {
  const res: Response | undefined = error?.context instanceof Response ? error.context : undefined;
  if (res) {
    try {
      const body = await res.clone().json();
      if (body?.error) return { message: String(body.error), code: body.code };
    } catch {
      try {
        const text = await res.clone().text();
        if (text) return { message: text.slice(0, 300) };
      } catch { /* ignore */ }
    }
    return { message: `Payment service error (HTTP ${res.status})` };
  }
  if (data?.error) return { message: String(data.error), code: data.code };
  if (error?.message) return { message: String(error.message) };
  return { message: "Could not reach the payment service. Please try again in a moment." };
}

export interface OpenCheckoutArgs {
  /** course_id (when kind = 'course') */
  courseId?: string;
  /** webinar_id (when kind = 'webinar') */
  webinarId?: string;
  /** plan_id (when kind = 'subscription') */
  planId?: string;
  billingInterval?: "monthly" | "yearly";
  kind?: "course" | "webinar" | "subscription";
  currency?: "INR" | "USD";
  /** enrollment fields for courses */
  enrollmentData?: Record<string, unknown>;
  /** registration fields for webinars */
  registrationData?: Record<string, unknown>;
  prefill?: { name?: string; email?: string; contact?: string };
  onSuccess?: (info: { enrollmentId?: string; webinarRegistrationId?: string; paymentId: string; invoiceUrl?: string }) => void;
  onDismiss?: () => void;
  /** Called whenever checkout could not start or failed — always fires so callers can clear their own loading state. */
  onError?: (info: { message: string; code?: string }) => void;
}


export function useRazorpayCheckout() {
  const [loading, setLoading] = useState(false);

  const openCheckout = useCallback(async (args: OpenCheckoutArgs) => {
    setLoading(true);
    const fail = (message: string, code?: string) => {
      console.error("[razorpay-checkout] failed", { message, code });
      toast({ title: "Could not start payment", description: message, variant: "destructive" });
      setLoading(false);
      args.onError?.({ message, code });
    };

    try {
      const ok = await loadScript(RAZORPAY_SCRIPT);
      if (!ok || !window.Razorpay) {
        fail("Could not load Razorpay. Check your connection and try again.", "SCRIPT_LOAD_FAILED");
        return;
      }

      const kind = args.kind ?? (args.planId ? "subscription" : args.webinarId ? "webinar" : "course");
      let data: any = null;
      let error: any = null;
      try {
        const res = await supabase.functions.invoke("razorpay-create-order", {
          body: {
            kind,
            course_id: args.courseId,
            webinar_id: args.webinarId,
            plan_id: args.planId,
            billing_interval: args.billingInterval ?? "monthly",
            currency: args.currency ?? "INR",
            enrollment_data: args.enrollmentData,
            registration_data: args.registrationData,
          },
        });
        data = res.data;
        error = res.error;
      } catch (e: any) {
        error = e;
      }
      if (error || !data?.success) {
        const info = await extractFunctionError(error, data);
        fail(info.message, info.code);
        return;
      }



      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: "AI Coach Portal",
        description: data.course_title || data.webinar_title || data.plan_title || (kind === "webinar" ? "Webinar registration" : kind === "subscription" ? "Subscription" : "Course enrollment"),
        order_id: data.order_id,
        prefill: { ...(data.prefill || {}), ...(args.prefill || {}) },
        theme: { color: "#84cc16" },
        modal: {
          ondismiss: () => {
            setLoading(false);
            args.onDismiss?.();
          },
        },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const { data: vData, error: vErr } = await supabase.functions.invoke("razorpay-verify-payment", { body: response });
            if (vErr || !vData?.success) {
              toast({ title: "Payment verification failed", description: vErr?.message || vData?.error || "Contact support if your card was charged.", variant: "destructive" });
              return;
            }
            toast({ title: "Payment successful", description: kind === "subscription" ? "Your subscription is now active." : kind === "webinar" ? "You are now registered for the webinar." : "You are now enrolled in the course." });
            args.onSuccess?.({
              enrollmentId: vData.enrollment_id,
              webinarRegistrationId: vData.webinar_registration_id,
              paymentId: response.razorpay_payment_id,
              invoiceUrl: vData.invoice_url,
            });
          } catch (e: any) {
            toast({ title: "Verification error", description: e?.message ?? "Unknown error", variant: "destructive" });
          } finally {
            setLoading(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp: any) => {
        const message = resp?.error?.description ?? "Please try again.";
        toast({ title: "Payment failed", description: message, variant: "destructive" });
        setLoading(false);
        args.onError?.({ message, code: resp?.error?.code ?? "PAYMENT_FAILED" });
      });
      rzp.open();
    } catch (e: any) {
      const message = e?.message ?? "Unknown error";
      toast({ title: "Checkout error", description: message, variant: "destructive" });
      setLoading(false);
      args.onError?.({ message, code: "CHECKOUT_EXCEPTION" });
    }
  }, []);


  return { openCheckout, loading };
}
