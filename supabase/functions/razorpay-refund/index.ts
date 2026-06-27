import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: cErr } = await userClient.auth.getClaims(token);
    if (cErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub as string;

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify admin role
    const { data: roleRow } = await admin
      .from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle();
    if (!roleRow) return json({ error: 'Forbidden — admin only' }, 403);

    const body = await req.json().catch(() => ({}));
    const { payment_id, amount, reason } = body ?? {};
    if (!payment_id) return json({ error: 'payment_id required' }, 400);

    const { data: payment, error: pErr } = await admin
      .from('payments').select('*').eq('id', payment_id).maybeSingle();
    if (pErr || !payment) return json({ error: 'Payment not found' }, 404);
    if (payment.status !== 'paid' && payment.status !== 'partially_refunded') {
      return json({ error: `Cannot refund payment with status ${payment.status}` }, 400);
    }
    if (!payment.razorpay_payment_id) return json({ error: 'No Razorpay payment ID on record' }, 400);

    const totalAmount = Number(payment.amount);
    const alreadyRefunded = Number(payment.refunded_amount || 0);
    const remaining = totalAmount - alreadyRefunded;
    const refundAmount = amount ? Number(amount) : remaining;

    if (refundAmount <= 0 || refundAmount > remaining) {
      return json({ error: `Refund amount must be > 0 and ≤ ${remaining}` }, 400);
    }

    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) return json({ error: 'Provider not configured' }, 500);

    const basic = btoa(`${keyId}:${keySecret}`);
    const rzpResp = await fetch(`https://api.razorpay.com/v1/payments/${payment.razorpay_payment_id}/refund`, {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: Math.round(refundAmount * 100),
        notes: { reason: reason ?? 'Admin refund', payment_id, initiated_by: userId },
      }),
    });

    const rzpJson = await rzpResp.json();
    if (!rzpResp.ok) {
      console.error('Razorpay refund error', rzpJson);
      return json({ error: rzpJson?.error?.description ?? 'Refund failed at Razorpay', details: rzpJson }, 502);
    }

    const newRefundedTotal = alreadyRefunded + refundAmount;
    const newStatus = newRefundedTotal >= totalAmount ? 'refunded' : 'partially_refunded';

    await admin.from('payment_refunds').insert({
      payment_id,
      razorpay_refund_id: rzpJson.id,
      razorpay_payment_id: payment.razorpay_payment_id,
      amount: refundAmount,
      currency: payment.currency,
      reason: reason ?? null,
      status: rzpJson.status ?? 'processed',
      created_by: userId,
      notes: rzpJson,
    });

    await admin.from('payments').update({
      status: newStatus,
      refund_status: newStatus,
      refunded_amount: newRefundedTotal,
      refunded_at: new Date().toISOString(),
    }).eq('id', payment_id);

    return json({ success: true, refund: rzpJson, new_status: newStatus });
  } catch (e) {
    console.error('refund error', e);
    return json({ error: (e as Error).message }, 500);
  }
});
