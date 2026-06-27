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

export interface OpenCheckoutArgs {
  courseId: string;
  currency?: "INR" | "USD";
  enrollmentData?: Record<string, unknown>;
  prefill?: { name?: string; email?: string; contact?: string };
  onSuccess?: (info: { enrollmentId?: string; paymentId: string }) => void;
  onDismiss?: () => void;
}

export function useRazorpayCheckout() {
  const [loading, setLoading] = useState(false);

  const openCheckout = useCallback(async (args: OpenCheckoutArgs) => {
    setLoading(true);
    try {
      const ok = await loadScript(RAZORPAY_SCRIPT);
      if (!ok || !window.Razorpay) {
        toast({ title: "Payment unavailable", description: "Could not load Razorpay. Check your connection and try again.", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase.functions.invoke("razorpay-create-order", {
        body: {
          course_id: args.courseId,
          currency: args.currency ?? "INR",
          enrollment_data: args.enrollmentData,
        },
      });
      if (error || !data?.success) {
        toast({ title: "Could not start payment", description: error?.message || data?.error || "Try again.", variant: "destructive" });
        return;
      }

      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: "AI Coach Portal",
        description: data.course_title || "Course enrollment",
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
            const { data: vData, error: vErr } = await supabase.functions.invoke("razorpay-verify-payment", {
              body: response,
            });
            if (vErr || !vData?.success) {
              toast({ title: "Payment verification failed", description: vErr?.message || vData?.error || "Contact support if your card was charged.", variant: "destructive" });
              return;
            }
            toast({ title: "Payment successful", description: "You are now enrolled in the course." });
            args.onSuccess?.({ enrollmentId: vData.enrollment_id, paymentId: response.razorpay_payment_id });
          } catch (e: any) {
            toast({ title: "Verification error", description: e?.message ?? "Unknown error", variant: "destructive" });
          } finally {
            setLoading(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp: any) => {
        toast({ title: "Payment failed", description: resp?.error?.description ?? "Please try again.", variant: "destructive" });
        setLoading(false);
      });
      rzp.open();
    } catch (e: any) {
      toast({ title: "Checkout error", description: e?.message ?? "Unknown error", variant: "destructive" });
      setLoading(false);
    }
  }, []);

  return { openCheckout, loading };
}
