import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, resolveOrCreateCustomer } from "../_shared/stripe.ts";

type Mode = "subscription" | "course" | "webinar";

interface Body {
  mode: Mode;
  environment: StripeEnv;
  returnUrl: string;
  // subscription mode:
  priceId?: string;
  // one-off modes:
  itemId?: string; // course.id or webinar.id
  itemTitle?: string;
  amount?: number; // major units (e.g. 99.00)
  currency?: "INR" | "USD" | string;
  enrollmentId?: string; // for course mode
  // user info (optional — may be derived from auth header)
  customerEmail?: string;
  userId?: string;
}

async function getAuthedUserId(authHeader: string | null): Promise<{ id?: string; email?: string }> {
  if (!authHeader?.startsWith("Bearer ")) return {};
  const token = authHeader.replace("Bearer ", "");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  const { data } = await supabase.auth.getUser(token);
  return { id: data.user?.id, email: data.user?.email ?? undefined };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as Body;
    const env: StripeEnv = body.environment === "live" ? "live" : "sandbox";
    if (!body.returnUrl) throw new Error("returnUrl is required");

    const authed = await getAuthedUserId(req.headers.get("Authorization"));
    const userId = body.userId || authed.id;
    const customerEmail = body.customerEmail || authed.email;

    const stripe = createStripeClient(env);
    const customerId = (customerEmail || userId)
      ? await resolveOrCreateCustomer(stripe, { email: customerEmail, userId })
      : undefined;

    let session: any;

    if (body.mode === "subscription") {
      if (!body.priceId || !/^[a-zA-Z0-9_-]+$/.test(body.priceId)) {
        throw new Error("Invalid priceId");
      }
      const prices = await stripe.prices.list({ lookup_keys: [body.priceId] });
      if (!prices.data.length) throw new Error("Price not found");
      const stripePrice = prices.data[0];

      session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: "subscription",
        ui_mode: "embedded_page",
        return_url: body.returnUrl,
        automatic_tax: { enabled: true },
        ...(customerId && { customer: customerId, customer_update: { address: "auto" } }),
        ...(userId && {
          metadata: { userId, kind: "subscription" },
          subscription_data: { metadata: { userId } },
        }),
      });
    } else {
      // course or webinar — dynamic price_data
      if (!body.itemId || !body.itemTitle || !body.amount || body.amount <= 0) {
        throw new Error("itemId, itemTitle and amount are required for one-off checkout");
      }
      const currency = (body.currency || "USD").toLowerCase();
      const unitAmount = Math.round(Number(body.amount) * 100);
      if (unitAmount < 50) throw new Error("Amount too small");

      session = await stripe.checkout.sessions.create({
        line_items: [{
          price_data: {
            currency,
            product_data: { name: body.itemTitle },
            unit_amount: unitAmount,
          },
          quantity: 1,
        }],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: body.returnUrl,
        automatic_tax: { enabled: true },
        ...(customerId && { customer: customerId, customer_update: { address: "auto" } }),
        payment_intent_data: { description: body.itemTitle },
        metadata: {
          ...(userId && { userId }),
          kind: body.mode,
          itemId: body.itemId,
          ...(body.enrollmentId && { enrollmentId: body.enrollmentId }),
        },
      });
    }

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("create-checkout error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
