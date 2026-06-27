import { createClient } from 'npm:@supabase/supabase-js@2';
import { createHmac } from 'node:crypto';

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
    const { data: claims, error: cErr } = await supabase.auth.getClaims(token);
    if (cErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body ?? {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return new Response(JSON.stringify({ error: 'Missing payment fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keySecret) {
      return new Response(JSON.stringify({ error: 'Provider not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const expected = createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: orderRow, error: orderErr } = await admin
      .from('razorpay_orders')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .maybeSingle();

    if (orderErr || !orderRow) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (orderRow.user_id !== userId) {
      return new Response(JSON.stringify({ error: 'Order does not belong to user' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (expected !== razorpay_signature) {
      await admin.from('razorpay_orders').update({
        status: 'signature_failed',
        error_code: 'BAD_SIGNATURE',
        error_description: 'Signature verification failed',
        razorpay_payment_id,
      }).eq('id', orderRow.id);
      return new Response(JSON.stringify({ error: 'Invalid payment signature' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Idempotent: if already paid, just return success
    if (orderRow.status === 'paid' && orderRow.signature_verified) {
      const { data: existingEnr } = await admin
        .from('enrollments')
        .select('id')
        .eq('learner_id', userId)
        .eq('course_id', orderRow.course_id)
        .maybeSingle();
      return new Response(JSON.stringify({ success: true, enrollment_id: existingEnr?.id, already_processed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await admin.from('razorpay_orders').update({
      status: 'paid',
      razorpay_payment_id,
      signature_verified: true,
      paid_at: new Date().toISOString(),
    }).eq('id', orderRow.id);

    // Fetch course for coach_id
    const { data: course } = await admin
      .from('courses')
      .select('coach_id')
      .eq('id', orderRow.course_id)
      .maybeSingle();

    const enrollmentData = (orderRow.enrollment_data ?? {}) as Record<string, unknown>;

    const enrollmentPayload: Record<string, unknown> = {
      learner_id: userId,
      course_id: orderRow.course_id,
      coach_id: course?.coach_id ?? orderRow.coach_id,
      payment_status: 'paid',
      payment_id: razorpay_payment_id,
      amount_paid: orderRow.amount,
      currency: orderRow.currency,
      payment_locked: true,
      razorpay_order_id,
      razorpay_payment_id,
      ...enrollmentData,
    };

    // Upsert enrollment (avoid duplicate if user re-pays)
    const { data: existing } = await admin
      .from('enrollments')
      .select('id')
      .eq('learner_id', userId)
      .eq('course_id', orderRow.course_id)
      .maybeSingle();

    let enrollmentId = existing?.id as string | undefined;
    if (enrollmentId) {
      await admin.from('enrollments').update(enrollmentPayload).eq('id', enrollmentId);
    } else {
      const { data: ins, error: insErr } = await admin
        .from('enrollments')
        .insert(enrollmentPayload)
        .select('id')
        .single();
      if (insErr) {
        console.error('enrollment insert error', insErr);
        return new Response(JSON.stringify({ error: 'Enrollment failed', details: insErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      enrollmentId = ins.id;
    }

    // Generate invoice number: INV-YYYYMM-<8 chars of payment id>
    const now = new Date();
    const yyyymm = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const invoiceId = `INV-${yyyymm}-${razorpay_payment_id.replace(/[^A-Za-z0-9]/g, '').slice(-8).toUpperCase()}`;
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
    const invoiceUrl = `https://www.aicoachportal.com/invoice/${razorpay_payment_id}`;

    const { data: insertedPayment } = await admin.from('payments').insert({
      enrollment_id: enrollmentId,
      user_id: userId,
      coach_id: course?.coach_id ?? orderRow.coach_id,
      amount: orderRow.amount,
      currency: orderRow.currency,
      payment_provider: 'razorpay',
      payment_provider_id: razorpay_payment_id,
      status: 'paid',
      kind: 'course',
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      invoice_id: invoiceId,
      invoice_url: invoiceUrl,
      paid_at: new Date().toISOString(),
    }).select('id').single();

    return new Response(JSON.stringify({ success: true, enrollment_id: enrollmentId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('verify-payment error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
