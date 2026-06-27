import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub as string;
    const userEmail = (claims.claims.email as string | undefined) ?? '';

    const body = await req.json().catch(() => ({}));
    const {
      kind: rawKind,
      course_id,
      webinar_id,
      currency: requestedCurrency,
      enrollment_data,
      registration_data,
    } = body ?? {};

    const kind = rawKind ?? (webinar_id ? 'webinar' : 'course');
    if (!['course', 'webinar'].includes(kind)) return json({ error: 'Unsupported kind' }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    let coachId: string | null = null;
    let priceInr = 0, priceUsd = 0, title = '';
    let receiptPrefix = '';
    let resolvedCourseId: string | null = null;
    let resolvedWebinarId: string | null = null;
    const notes: Record<string, unknown> = { kind, user_id: userId };

    if (kind === 'course') {
      if (!course_id) return json({ error: 'course_id required' }, 400);
      const { data: c, error } = await admin
        .from('courses').select('id, title, coach_id, price_inr, price_usd, is_published')
        .eq('id', course_id).maybeSingle();
      if (error || !c) return json({ error: 'Course not found' }, 404);
      coachId = c.coach_id; priceInr = Number(c.price_inr ?? 0); priceUsd = Number(c.price_usd ?? 0); title = c.title ?? '';
      resolvedCourseId = c.id; receiptPrefix = 'c'; notes.course_id = c.id; notes.course_title = c.title;
    } else {
      if (!webinar_id) return json({ error: 'webinar_id required' }, 400);
      const { data: w, error } = await admin
        .from('webinars').select('id, title, coach_id, price_inr, price_usd, is_paid, is_published')
        .eq('id', webinar_id).maybeSingle();
      if (error || !w) return json({ error: 'Webinar not found' }, 404);
      if (!w.is_paid) return json({ error: 'Webinar is free — no payment required' }, 400);
      coachId = w.coach_id; priceInr = Number(w.price_inr ?? 0); priceUsd = Number(w.price_usd ?? 0); title = w.title ?? '';
      resolvedWebinarId = w.id; receiptPrefix = 'w'; notes.webinar_id = w.id; notes.webinar_title = w.title;
    }

    const currency = (requestedCurrency === 'USD' ? 'USD' : 'INR') as 'INR' | 'USD';
    const priceMajor = currency === 'INR' ? priceInr : priceUsd;
    if (!priceMajor || priceMajor <= 0) return json({ error: 'Item is free or has no price set' }, 400);
    const amountMinor = Math.round(priceMajor * 100);

    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) return json({ error: 'Payment provider not configured' }, 500);

    const idSlice = (resolvedCourseId ?? resolvedWebinarId ?? 'xxxxxxxx').slice(0, 8);
    const receipt = `${receiptPrefix}_${idSlice}_${Date.now().toString(36)}`.slice(0, 40);
    const authStr = btoa(`${keyId}:${keySecret}`);

    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${authStr}` },
      body: JSON.stringify({ amount: amountMinor, currency, receipt, notes }),
    });
    const rzpJson = await rzpRes.json();
    if (!rzpRes.ok) {
      console.error('Razorpay order create failed', rzpJson);
      return json({ error: rzpJson?.error?.description ?? 'Razorpay error' }, 502);
    }

    await admin.from('razorpay_orders').insert({
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
      notes: { title, kind },
      enrollment_data: kind === 'course' ? (enrollment_data ?? null) : (registration_data ?? null),
    });

    return json({
      success: true,
      order_id: rzpJson.id,
      amount: amountMinor,
      currency,
      key_id: keyId,
      kind,
      course_title: kind === 'course' ? title : undefined,
      webinar_title: kind === 'webinar' ? title : undefined,
      prefill: { email: userEmail },
    });
  } catch (e) {
    console.error('create-order error', e);
    return json({ error: (e as Error).message }, 500);
  }
});
