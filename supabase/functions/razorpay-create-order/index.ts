import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claims.claims.sub as string;
    const userEmail = (claims.claims.email as string | undefined) ?? '';

    const body = await req.json().catch(() => ({}));
    const { course_id, currency: requestedCurrency, enrollment_data } = body ?? {};
    if (!course_id || typeof course_id !== 'string') {
      return new Response(JSON.stringify({ error: 'course_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: course, error: courseErr } = await admin
      .from('courses')
      .select('id, title, coach_id, price_inr, price_usd, is_published')
      .eq('id', course_id)
      .maybeSingle();
    if (courseErr || !course) {
      return new Response(JSON.stringify({ error: 'Course not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const currency = (requestedCurrency === 'USD' ? 'USD' : 'INR') as 'INR' | 'USD';
    const priceMajor = currency === 'INR' ? Number(course.price_inr ?? 0) : Number(course.price_usd ?? 0);
    if (!priceMajor || priceMajor <= 0) {
      return new Response(JSON.stringify({ error: 'Course is free or has no price set' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const amountMinor = Math.round(priceMajor * 100);

    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) {
      return new Response(JSON.stringify({ error: 'Payment provider not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const receipt = `c_${course_id.slice(0, 8)}_${Date.now().toString(36)}`.slice(0, 40);
    const authStr = btoa(`${keyId}:${keySecret}`);

    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${authStr}` },
      body: JSON.stringify({
        amount: amountMinor,
        currency,
        receipt,
        notes: { course_id, user_id: userId, coach_id: course.coach_id ?? '', course_title: course.title ?? '' },
      }),
    });

    const rzpJson = await rzpRes.json();
    if (!rzpRes.ok) {
      console.error('Razorpay order create failed', rzpJson);
      return new Response(JSON.stringify({ error: rzpJson?.error?.description ?? 'Razorpay error' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await admin.from('razorpay_orders').insert({
      user_id: userId,
      course_id,
      coach_id: course.coach_id,
      razorpay_order_id: rzpJson.id,
      receipt,
      amount: priceMajor,
      currency,
      status: 'created',
      notes: { course_title: course.title },
      enrollment_data: enrollment_data ?? null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        order_id: rzpJson.id,
        amount: amountMinor,
        currency,
        key_id: keyId,
        course_title: course.title,
        prefill: { email: userEmail },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('create-order error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
