// Server-side confirmation sender (email + optional WhatsApp).
// Invoked from razorpay-verify-payment; not directly callable from clients.
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
    const body = await req.json().catch(() => ({}));
    const {
      payment_id,
      kind = 'course',
      recipient_email,
      recipient_name,
      recipient_phone,
      item_title,
      amount,
      currency,
      invoice_url,
    } = body ?? {};

    if (!recipient_email) return json({ skipped: true, reason: 'no recipient email' });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : `${currency} `;
    const amountStr = `${symbol}${Number(amount ?? 0).toFixed(2)} ${currency ?? ''}`.trim();
    const itemLabel = kind === 'webinar' ? 'webinar registration' : 'course enrollment';

    const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #1a1a1a; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="background: linear-gradient(135deg, #84cc16, #65a30d); padding: 28px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; color: #ffffff;">✅ Payment Confirmed</h1>
        </div>
        <div style="padding: 28px;">
          <p style="font-size: 16px; margin: 0 0 12px;">Hi <strong>${escapeHtml(recipient_name || 'there')}</strong>,</p>
          <p style="color: #4b5563; line-height: 1.6;">Thanks for your payment. Your ${itemLabel} for <strong>${escapeHtml(item_title || '')}</strong> is now confirmed.</p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid #84cc16;">
            <p style="margin: 0; color: #1a1a1a;"><strong>Amount paid:</strong> ${amountStr}</p>
            <p style="margin: 6px 0 0; color: #1a1a1a;"><strong>Payment ID:</strong> <span style="font-family: monospace; font-size: 13px;">${escapeHtml(payment_id || '')}</span></p>
          </div>
          ${invoice_url ? `<p style="text-align:center; margin: 24px 0;"><a href="${invoice_url}" style="display: inline-block; background: #84cc16; color: #0a0a0a; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600;">View Invoice →</a></p>` : ''}
          <p style="color: #9ca3af; font-size: 12px; margin-top: 28px; text-align: center;">AI Coach Portal · aicoachportal.com</p>
        </div>
      </div>
    `;

    let emailStatus = 'skipped';
    let emailError: string | null = null;

    // Try Lovable AI Gateway → Resend connector first; fall back to direct RESEND_API_KEY
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    const resendKey = Deno.env.get('RESEND_API_KEY');
    const fromAddress = 'AI Coach Portal <noreply@aicoachportal.com>';
    const subject = `Payment confirmed — ${item_title || (kind === 'webinar' ? 'webinar' : 'course')}`;

    const tryResendDirect = async () => {
      if (!resendKey) return false;
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: fromAddress, to: [recipient_email], subject, html }),
      });
      if (!res.ok) { emailError = await res.text(); return false; }
      return true;
    };

    const tryResendGateway = async () => {
      if (!lovableKey || !resendKey) return false;
      const res = await fetch('https://connector-gateway.lovable.dev/resend/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          'X-Connection-Api-Key': resendKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: fromAddress, to: [recipient_email], subject, html }),
      });
      if (!res.ok) { emailError = await res.text(); return false; }
      return true;
    };

    if (await tryResendGateway()) emailStatus = 'sent';
    else if (await tryResendDirect()) emailStatus = 'sent';
    else emailStatus = 'failed';

    // Best-effort WhatsApp via existing whatsapp_messages / Digital SMS credentials (optional)
    let whatsappStatus = 'skipped';
    if (recipient_phone) {
      try {
        await admin.from('whatsapp_messages').insert({
          recipient_phone,
          message_type: 'payment_confirmation',
          message_body: `Hi ${recipient_name || ''}, your payment of ${amountStr} for "${item_title || ''}" is confirmed. Invoice: ${invoice_url ?? ''}`,
          status: 'queued',
          metadata: { payment_id, kind },
        } as any);
        whatsappStatus = 'queued';
      } catch (e) {
        console.warn('whatsapp queue failed', (e as Error).message);
      }
    }

    return json({ success: true, email: emailStatus, whatsapp: whatsappStatus, error: emailError });
  } catch (e) {
    console.error('send-confirmation error', e);
    return json({ error: (e as Error).message }, 500);
  }
});

function escapeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
