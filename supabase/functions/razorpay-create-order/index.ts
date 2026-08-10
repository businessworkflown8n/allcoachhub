import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
/** Structured, human-readable error. Never includes secret values. */
const fail = (error: string, code: string, status: number, extra?: Record<string, unknown>) => {
  console.error(`[razorpay-create-order] ${code}: ${error}`, extra ?? {});
  return json({ success: false, error, code, ...(extra ?? {}) }, status);
};

const FN_VERSION = '2026-08-10.1';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (new URL(req.url).searchParams.get('health') === '1') {
    return json({
      version: FN_VERSION,
      razorpay_key_id: !!Deno.env.get('RAZORPAY_KEY_ID'),
      razorpay_key_secret: !!Deno.env.get('RAZORPAY_KEY_SECRET'),
    });
  }


  try {
    // --- Server configuration checks (fail loudly with the exact missing name) ---
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SB_SECRET_KEY');
    const missingEnv = [
      !supabaseUrl && 'SUPABASE_URL',
      !anonKey && 'SUPABASE_ANON_KEY',
      !serviceKey && 'SUPABASE_SERVICE_ROLE_KEY',
    ].filter(Boolean) as string[];
    if (missingEnv.length) {
      return fail(
        `Payment service is misconfigured. Missing server setting(s): ${missingEnv.join(', ')}.`,
        'SERVER_MISCONFIGURED',
        500,
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return fail('You must be signed in to start a payment.', 'NOT_AUTHENTICATED', 401);
    }

    const supabase = createClient(supabaseUrl!, anonKey!, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return fail('Your session has expired. Please sign in again and retry.', 'SESSION_INVALID', 401);
    }
    const userId = claims.claims.sub as string;
    const userEmail = (claims.claims.email as string | undefined) ?? '';


    const body = await req.json().catch(() => ({}));
    const {
      kind: rawKind,
      course_id,
      webinar_id,
      plan_id,
      billing_interval: rawInterval,
      currency: requestedCurrency,
      enrollment_data,
      registration_data,
    } = body ?? {};

    const kind = rawKind ?? (webinar_id ? 'webinar' : plan_id ? 'subscription' : 'course');
    if (!['course', 'webinar', 'subscription'].includes(kind)) {
      return fail(`Unsupported purchase type "${String(kind)}".`, 'INVALID_KIND', 400);
    }

    const admin = createClient(supabaseUrl!, serviceKey!);


    let coachId: string | null = null;
    let priceInr = 0, priceUsd = 0, title = '';
    let receiptPrefix = '';
    let resolvedCourseId: string | null = null;
    let resolvedWebinarId: string | null = null;
    let resolvedPlanId: string | null = null;
    const billingInterval: 'monthly' | 'yearly' = (rawInterval === 'yearly' ? 'yearly' : 'monthly');
    const notes: Record<string, unknown> = { kind, user_id: userId };

    if (kind === 'course') {
      if (!course_id) return fail('No course was specified for this payment.', 'MISSING_COURSE_ID', 400);
      const { data: c, error } = await admin
        .from('courses').select('id, title, coach_id, price_inr, price_usd, is_published')
        .eq('id', course_id).maybeSingle();
      if (error) return fail(`Could not load the course: ${error.message}`, 'DB_COURSE_LOOKUP_FAILED', 500);
      if (!c) return fail('This course no longer exists.', 'COURSE_NOT_FOUND', 404);
      coachId = c.coach_id; priceInr = Number(c.price_inr ?? 0); priceUsd = Number(c.price_usd ?? 0); title = c.title ?? '';
      resolvedCourseId = c.id; receiptPrefix = 'c'; notes.course_id = c.id; notes.course_title = c.title;
    } else if (kind === 'webinar') {
      if (!webinar_id) return fail('No webinar was specified for this payment.', 'MISSING_WEBINAR_ID', 400);
      const { data: w, error } = await admin
        .from('webinars').select('id, title, coach_id, price_inr, price_usd, is_paid, is_published')
        .eq('id', webinar_id).maybeSingle();
      if (error) return fail(`Could not load the webinar: ${error.message}`, 'DB_WEBINAR_LOOKUP_FAILED', 500);
      if (!w) return fail('This webinar no longer exists.', 'WEBINAR_NOT_FOUND', 404);
      if (!w.is_paid) return fail('This webinar is free — no payment is required.', 'WEBINAR_IS_FREE', 400);
      coachId = w.coach_id; priceInr = Number(w.price_inr ?? 0); priceUsd = Number(w.price_usd ?? 0); title = w.title ?? '';
      resolvedWebinarId = w.id; receiptPrefix = 'w'; notes.webinar_id = w.id; notes.webinar_title = w.title;
    } else {
      if (!plan_id) return fail('No subscription plan was specified.', 'MISSING_PLAN_ID', 400);
      const { data: p, error } = await admin
        .from('subscription_plans')
        .select('id, name, slug, price, yearly_price, currency, is_active')
        .eq('id', plan_id).maybeSingle();
      if (error) return fail(`Could not load the plan: ${error.message}`, 'DB_PLAN_LOOKUP_FAILED', 500);
      if (!p) return fail('This subscription plan no longer exists.', 'PLAN_NOT_FOUND', 404);
      if (!p.is_active) return fail('This subscription plan is no longer available.', 'PLAN_INACTIVE', 400);
      const amt = billingInterval === 'yearly' ? Number(p.yearly_price ?? 0) : Number(p.price ?? 0);
      if (!amt || amt <= 0) return fail(`No ${billingInterval} price is configured for this plan.`, 'PLAN_PRICE_MISSING', 400);
      priceInr = amt; priceUsd = 0; title = `${p.name} (${billingInterval})`;
      resolvedPlanId = p.id; coachId = userId;
      receiptPrefix = 's';
      notes.plan_id = p.id; notes.plan_slug = p.slug; notes.billing_interval = billingInterval;
    }

    const currency = (requestedCurrency === 'USD' ? 'USD' : 'INR') as 'INR' | 'USD';
    const priceMajor = currency === 'INR' ? priceInr : priceUsd;
    if (!priceMajor || priceMajor <= 0) {
      return fail(`No ${currency} price is set for this item. Please contact support.`, 'PRICE_NOT_SET', 400);
    }

    const amountMinor = Math.round(priceMajor * 100);

    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) {
      const missing = [!keyId && 'RAZORPAY_KEY_ID', !keySecret && 'RAZORPAY_KEY_SECRET'].filter(Boolean).join(', ');
      return fail(`Payment provider is not configured. Missing: ${missing}.`, 'PAYMENT_PROVIDER_NOT_CONFIGURED', 500);
    }

    const idSlice = (resolvedCourseId ?? resolvedWebinarId ?? resolvedPlanId ?? 'xxxxxxxx').slice(0, 8);
    const receipt = `${receiptPrefix}_${idSlice}_${Date.now().toString(36)}`.slice(0, 40);
    const authStr = btoa(`${keyId}:${keySecret}`);

    let rzpRes: Response;
    let rzpJson: any;
    try {
      rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Basic ${authStr}` },
        body: JSON.stringify({ amount: amountMinor, currency, receipt, notes }),
      });
      rzpJson = await rzpRes.json().catch(() => ({}));
    } catch (e) {
      return fail(`Could not reach Razorpay: ${(e as Error).message}`, 'PAYMENT_GATEWAY_UNREACHABLE', 502);
    }

    if (!rzpRes.ok) {
      // Razorpay returns 401 for bad/expired API keys — surface that distinctly.
      if (rzpRes.status === 401) {
        return fail(
          'Razorpay rejected the API credentials. The RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET secrets need to be updated.',
          'PAYMENT_PROVIDER_AUTH_FAILED',
          502,
        );
      }
      const desc = rzpJson?.error?.description ?? `Razorpay returned HTTP ${rzpRes.status}`;
      return fail(desc, 'PAYMENT_CREATION_FAILED', 502, { provider_status: rzpRes.status });
    }

    // Persist the order in Supabase BEFORE handing the user to checkout, so the
    // webhook/verify step always has a record to reconcile against.
    const { error: orderInsertErr } = await admin.from('razorpay_orders').insert({
      user_id: userId,
      kind,
      course_id: resolvedCourseId,
      webinar_id: resolvedWebinarId,
      coach_id: coachId,
      razorpay_order_id: rzpJson.id,
      receipt,
      amount: priceMajor,
      currency,
      status: 'created',
      notes: { title, kind, plan_id: resolvedPlanId, billing_interval: billingInterval },
      enrollment_data:
        kind === 'course' ? (enrollment_data ?? null)
        : kind === 'webinar' ? (registration_data ?? null)
        : { plan_id: resolvedPlanId, billing_interval: billingInterval },
    });
    if (orderInsertErr) {
      return fail(
        `Payment order could not be recorded: ${orderInsertErr.message}`,
        'DB_ORDER_INSERT_FAILED',
        500,
      );
    }

    return json({
      success: true,
      order_id: rzpJson.id,
      amount: amountMinor,
      currency,
      key_id: keyId,
      kind,
      course_title: kind === 'course' ? title : undefined,
      webinar_title: kind === 'webinar' ? title : undefined,
      plan_title: kind === 'subscription' ? title : undefined,
      prefill: { email: userEmail },
    });
  } catch (e) {
    return fail(`Unexpected payment error: ${(e as Error).message}`, 'UNEXPECTED_ERROR', 500);
  }
});

