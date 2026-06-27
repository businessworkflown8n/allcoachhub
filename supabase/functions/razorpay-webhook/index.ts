import { createClient } from 'npm:@supabase/supabase-js@2';
import { createHmac } from 'node:crypto';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-razorpay-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
    if (!webhookSecret) {
      return new Response(JSON.stringify({ error: 'Webhook secret not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const signature = req.headers.get('x-razorpay-signature') ?? '';
    const raw = await req.text();
    const expected = createHmac('sha256', webhookSecret).update(raw).digest('hex');
    if (expected !== signature) {
      console.warn('Razorpay webhook bad signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const event = JSON.parse(raw);
    const eventType = event?.event as string;
    const payment = event?.payload?.payment?.entity;
    const orderId = payment?.order_id as string | undefined;
    const paymentId = payment?.id as string | undefined;

    if (!orderId) {
      return new Response(JSON.stringify({ received: true, ignored: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (eventType === 'payment.captured' || eventType === 'payment.authorized') {
      await admin.from('razorpay_orders')
        .update({
          status: 'paid',
          razorpay_payment_id: paymentId,
          paid_at: new Date().toISOString(),
        })
        .eq('razorpay_order_id', orderId)
        .neq('status', 'paid');
    } else if (eventType === 'payment.failed') {
      await admin.from('razorpay_orders').update({
        status: 'failed',
        razorpay_payment_id: paymentId,
        error_code: payment?.error_code ?? null,
        error_description: payment?.error_description ?? null,
      }).eq('razorpay_order_id', orderId);
    }

    return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('webhook error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
