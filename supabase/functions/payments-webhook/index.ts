import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

// ---- Subscription handlers ----

async function upsertSubscription(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    console.error("No userId in subscription metadata", subscription.id);
    return;
  }
  const item = subscription.items?.data?.[0];
  const priceId = item?.price?.lookup_key
    || item?.price?.metadata?.lovable_external_id
    || item?.price?.id;
  const productId = item?.price?.product;
  const periodStart = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  await getSupabase().from("stripe_subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      product_id: productId,
      price_id: priceId,
      status: subscription.status,
      current_period_start: periodStart ? new Date(periodStart * 1000).toISOString() : null,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      environment: env,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );
}

async function markCanceled(subscription: any, env: StripeEnv) {
  await getSupabase()
    .from("stripe_subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);
}

// ---- One-off (course / webinar) handler ----

async function handleCheckoutComplete(session: any, env: StripeEnv) {
  // Only one-off payments processed here; subscription rows are upserted via subscription events.
  if (session.mode !== "payment") return;
  if (session.payment_status !== "paid") return;

  const meta = session.metadata || {};
  const kind = meta.kind as string;
  const userId = meta.userId as string | undefined;
  const itemId = meta.itemId as string | undefined;
  const enrollmentId = meta.enrollmentId as string | undefined;
  const amount = (session.amount_total || 0) / 100;
  const currency = (session.currency || "usd").toUpperCase();

  if (kind === "course" && enrollmentId && userId) {
    // 1) Mark enrollment paid + locked
    await getSupabase()
      .from("enrollments")
      .update({
        payment_status: "completed",
        payment_id: session.payment_intent,
        amount_paid: amount,
        currency,
        payment_locked: true,
      })
      .eq("id", enrollmentId);

    // 2) Get coach_id for payments row
    const { data: enr } = await getSupabase()
      .from("enrollments")
      .select("coach_id")
      .eq("id", enrollmentId)
      .single();

    // 3) Insert payments row
    if (enr) {
      const platformFee = amount * 0.10;
      await getSupabase().from("payments").insert({
        enrollment_id: enrollmentId,
        user_id: userId,
        coach_id: (enr as any).coach_id,
        amount,
        currency,
        platform_commission: platformFee,
        coach_earning: amount - platformFee,
        payment_provider: "stripe",
        payment_provider_id: session.payment_intent,
        stripe_session_id: session.id,
        status: "completed",
        kind: "course",
      });
    }

    // 4) Fire payment confirmation email (best-effort)
    try {
      await getSupabase().functions.invoke("send-payment-confirmation", {
        body: { enrollment_id: enrollmentId },
      });
    } catch (e) {
      console.error("send-payment-confirmation failed:", e);
    }
  } else if (kind === "webinar" && itemId && userId) {
    // 1) Get webinar + learner profile
    const { data: profile } = await getSupabase()
      .from("profiles")
      .select("full_name, email, contact_number")
      .eq("user_id", userId)
      .single();

    // 2) Upsert webinar_registrations
    await getSupabase().from("webinar_registrations").upsert({
      webinar_id: itemId,
      learner_id: userId,
      registrant_name: (profile as any)?.full_name || "Unknown",
      registrant_email: (profile as any)?.email || "",
      registrant_phone: (profile as any)?.contact_number || "",
      payment_status: "completed",
      amount_paid: amount,
      payment_id: session.payment_intent,
    } as any, { onConflict: "webinar_id,learner_id" } as any);

    // 3) Insert webinar_payments row
    await getSupabase().from("webinar_payments").insert({
      webinar_id: itemId,
      learner_id: userId,
      amount,
      currency,
      payment_id: session.payment_intent,
      payment_status: "completed",
    } as any);

    // 4) Fire confirmation email
    try {
      await getSupabase().functions.invoke("send-webinar-confirmation", {
        body: { webinar_id: itemId, learner_id: userId },
      });
    } catch (e) {
      console.error("send-webinar-confirmation failed:", e);
    }
  }
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await upsertSubscription(event.data.object, env);
      break;
    case "customer.subscription.deleted":
      await markCanceled(event.data.object, env);
      break;
    case "checkout.session.completed":
      await handleCheckoutComplete(event.data.object, env);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    console.error("Webhook missing/invalid env:", rawEnv);
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    await handleWebhook(req, rawEnv);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
