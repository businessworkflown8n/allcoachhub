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

    const kind = (orderRow.kind as string) || 'course';

    // Idempotent: if already paid, return success
    if (orderRow.status === 'paid' && orderRow.signature_verified) {
      return new Response(JSON.stringify({ success: true, already_processed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await admin.from('razorpay_orders').update({
      status: 'paid',
      razorpay_payment_id,
      signature_verified: true,
      paid_at: new Date().toISOString(),
    }).eq('id', orderRow.id);

    // Invoice number
    const now = new Date();
    const yyyymm = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const invoiceId = `INV-${yyyymm}-${razorpay_payment_id.replace(/[^A-Za-z0-9]/g, '').slice(-8).toUpperCase()}`;
    const invoiceUrl = `https://www.aicoachportal.com/invoice/${razorpay_payment_id}`;

    let enrollmentId: string | undefined;
    let webinarRegId: string | undefined;
    let digitalProductOrderId: string | undefined;
    let coachId: string | null = orderRow.coach_id;
    let itemTitle = '';
    let learnerEmail = '';
    let learnerName = '';
    let learnerPhone = '';

    if (kind === 'course') {
      const { data: course } = await admin
        .from('courses').select('coach_id, title').eq('id', orderRow.course_id).maybeSingle();
      coachId = course?.coach_id ?? orderRow.coach_id;
      itemTitle = course?.title ?? '';

      const enrollmentData = (orderRow.enrollment_data ?? {}) as Record<string, unknown>;
      learnerEmail = String(enrollmentData.email ?? '');
      learnerName = String(enrollmentData.full_name ?? '');
      learnerPhone = String(enrollmentData.contact_number ?? '');

      const enrollmentPayload: Record<string, unknown> = {
        learner_id: userId,
        course_id: orderRow.course_id,
        coach_id: coachId,
        payment_status: 'paid',
        payment_id: razorpay_payment_id,
        amount_paid: orderRow.amount,
        currency: orderRow.currency,
        payment_locked: true,
        razorpay_order_id,
        razorpay_payment_id,
        ...enrollmentData,
      };

      const { data: existing } = await admin
        .from('enrollments').select('id').eq('learner_id', userId).eq('course_id', orderRow.course_id).maybeSingle();
      enrollmentId = existing?.id;
      if (enrollmentId) {
        await admin.from('enrollments').update(enrollmentPayload).eq('id', enrollmentId);
      } else {
        const { data: ins, error: insErr } = await admin.from('enrollments').insert(enrollmentPayload).select('id').single();
        if (insErr) {
          console.error('enrollment insert error', insErr);
          return new Response(JSON.stringify({ error: 'Enrollment failed', details: insErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        enrollmentId = ins.id;
      }
    } else if (kind === 'webinar') {
      const { data: webinar } = await admin
        .from('webinars').select('coach_id, title').eq('id', orderRow.webinar_id).maybeSingle();
      coachId = webinar?.coach_id ?? orderRow.coach_id;
      itemTitle = webinar?.title ?? '';

      const regData = (orderRow.enrollment_data ?? {}) as Record<string, unknown>;
      learnerEmail = String(regData.email ?? regData.registrant_email ?? '');
      learnerName = String(regData.full_name ?? regData.registrant_name ?? '');
      learnerPhone = String(regData.contact_number ?? regData.registrant_phone ?? '');

      // Upsert webinar registration
      const { data: existing } = await admin
        .from('webinar_registrations').select('id')
        .eq('webinar_id', orderRow.webinar_id).eq('learner_id', userId).maybeSingle();

      const regPayload = {
        webinar_id: orderRow.webinar_id,
        learner_id: userId,
        registrant_name: learnerName,
        registrant_email: learnerEmail,
        registrant_phone: learnerPhone,
        payment_status: 'paid',
        amount_paid: orderRow.amount,
        payment_id: razorpay_payment_id,
      };

      if (existing?.id) {
        await admin.from('webinar_registrations').update(regPayload).eq('id', existing.id);
        webinarRegId = existing.id;
      } else {
        const { data: ins, error: insErr } = await admin.from('webinar_registrations').insert(regPayload).select('id').single();
        if (insErr) {
          console.error('webinar registration insert error', insErr);
          return new Response(JSON.stringify({ error: 'Registration failed', details: insErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        webinarRegId = ins.id;
      }

      await admin.from('webinar_payments').insert({
        webinar_id: orderRow.webinar_id,
        learner_id: userId,
        amount: orderRow.amount,
        currency: orderRow.currency,
        payment_id: razorpay_payment_id,
        payment_status: 'paid',
      });
    } else if (kind === 'digital_product') {
      const { data: product } = await admin
        .from('digital_products')
        .select('coach_id, title, currency, product_type, linked_course_id, linked_webinar_id, linked_workshop_id')
        .eq('id', orderRow.digital_product_id).maybeSingle();
      if (!product) {
        return new Response(JSON.stringify({ error: 'Product no longer exists' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      coachId = product.coach_id ?? orderRow.coach_id;
      itemTitle = product.title ?? '';

      const enrollmentData = (orderRow.enrollment_data ?? {}) as Record<string, unknown>;
      learnerEmail = String(enrollmentData.email ?? '');
      learnerName = String(enrollmentData.full_name ?? '');
      learnerPhone = String(enrollmentData.contact_number ?? '');

      const { data: settings } = await admin
        .from('digital_product_settings').select('platform_commission_percent').limit(1).maybeSingle();
      const commissionPct = Number(settings?.platform_commission_percent ?? 0);
      const amount = Number(orderRow.amount ?? 0);
      const platformFee = Math.round(amount * (commissionPct / 100) * 100) / 100;
      const netToCoach = Math.round((amount - platformFee) * 100) / 100;
      const isLinked = !!(product.linked_course_id || product.linked_webinar_id || product.linked_workshop_id);
      const instantContent = ['document', 'video', 'image', 'text', 'link'].includes(product.product_type);

      const { data: existingDpOrder } = await admin
        .from('digital_product_orders').select('id')
        .eq('product_id', orderRow.digital_product_id).eq('buyer_id', userId).maybeSingle();

      if (existingDpOrder?.id) {
        await admin.from('digital_product_orders').update({
          payment_status: 'paid', payment_ref: razorpay_payment_id, updated_at: new Date().toISOString(),
        }).eq('id', existingDpOrder.id);
        digitalProductOrderId = existingDpOrder.id;
      } else {
        const { data: ins, error: insErr } = await admin.from('digital_product_orders').insert({
          product_id: orderRow.digital_product_id,
          coach_id: coachId,
          buyer_id: userId,
          amount_paid: amount,
          platform_fee: platformFee,
          gateway_fee: 0,
          net_to_coach: netToCoach,
          currency: orderRow.currency,
          payment_status: 'paid',
          payment_ref: razorpay_payment_id,
          delivery_status: isLinked || instantContent ? 'delivered' : 'pending',
        }).select('id').single();
        if (insErr) {
          console.error('digital product order insert error', insErr);
          return new Response(JSON.stringify({ error: 'Order recording failed', details: insErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        digitalProductOrderId = ins.id;
      }

      const { data: curProduct } = await admin.from('digital_products').select('sales_count').eq('id', orderRow.digital_product_id).maybeSingle();
      await admin.from('digital_products').update({ sales_count: (curProduct?.sales_count ?? 0) + 1 }).eq('id', orderRow.digital_product_id);

      if (product.linked_course_id) {
        const enrollmentPayload: Record<string, unknown> = {
          learner_id: userId,
          course_id: product.linked_course_id,
          coach_id: coachId,
          payment_status: 'paid',
          payment_id: razorpay_payment_id,
          amount_paid: orderRow.amount,
          currency: orderRow.currency,
          payment_locked: true,
          razorpay_order_id,
          razorpay_payment_id,
          ...enrollmentData,
        };
        const { data: existingEnr } = await admin
          .from('enrollments').select('id').eq('learner_id', userId).eq('course_id', product.linked_course_id).maybeSingle();
        if (existingEnr?.id) {
          await admin.from('enrollments').update(enrollmentPayload).eq('id', existingEnr.id);
          enrollmentId = existingEnr.id;
        } else {
          const { data: ins, error: insErr } = await admin.from('enrollments').insert(enrollmentPayload).select('id').single();
          if (insErr) {
            console.error('linked-course enrollment insert error', insErr);
            return new Response(JSON.stringify({ error: 'Enrollment failed', details: insErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
          enrollmentId = ins.id;
        }
      }

      if (product.linked_webinar_id) {
        const { data: existingReg } = await admin
          .from('webinar_registrations').select('id')
          .eq('webinar_id', product.linked_webinar_id).eq('learner_id', userId).maybeSingle();
        const regPayload = {
          webinar_id: product.linked_webinar_id,
          learner_id: userId,
          registrant_name: learnerName,
          registrant_email: learnerEmail,
          registrant_phone: learnerPhone,
          payment_status: 'paid',
          amount_paid: orderRow.amount,
          payment_id: razorpay_payment_id,
        };
        if (existingReg?.id) {
          await admin.from('webinar_registrations').update(regPayload).eq('id', existingReg.id);
          webinarRegId = existingReg.id;
        } else {
          const { data: ins } = await admin.from('webinar_registrations').insert(regPayload).select('id').single();
          webinarRegId = ins?.id;
        }
        await admin.from('webinar_payments').insert({
          webinar_id: product.linked_webinar_id,
          learner_id: userId,
          amount: orderRow.amount,
          currency: orderRow.currency,
          payment_id: razorpay_payment_id,
          payment_status: 'paid',
        });
      }

      if (product.linked_workshop_id) {
        await admin.from('workshop_registrations').upsert(
          { workshop_id: product.linked_workshop_id, user_id: userId, status: 'registered' },
          { onConflict: 'workshop_id,user_id' },
        );
      }
    } else if (kind === 'subscription') {
      const enrData = (orderRow.enrollment_data ?? {}) as Record<string, unknown>;
      const planId = String(enrData.plan_id ?? '');
      const billingInterval = String(enrData.billing_interval ?? 'monthly');

      const { data: plan } = await admin
        .from('subscription_plans').select('name').eq('id', planId).maybeSingle();
      itemTitle = plan?.name ? `${plan.name} (${billingInterval})` : 'Subscription';

      const { data: prof } = await admin
        .from('profiles').select('full_name, email, contact_number').eq('id', userId).maybeSingle();
      learnerEmail = prof?.email ?? '';
      learnerName = prof?.full_name ?? '';
      learnerPhone = prof?.contact_number ?? '';

      const { error: actErr } = await admin.rpc('activate_subscription', {
        _coach_id: userId,
        _plan_id: planId,
        _billing_interval: billingInterval,
        _amount: orderRow.amount,
        _currency: orderRow.currency,
        _razorpay_order_id: razorpay_order_id,
        _razorpay_payment_id: razorpay_payment_id,
      });
      if (actErr) {
        console.error('activate_subscription error', actErr);
        return new Response(JSON.stringify({ error: 'Subscription activation failed', details: actErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    await admin.from('payments').insert({
      enrollment_id: enrollmentId ?? null,
      user_id: userId,
      coach_id: coachId,
      amount: orderRow.amount,
      currency: orderRow.currency,
      payment_provider: 'razorpay',
      payment_provider_id: razorpay_payment_id,
      status: 'paid',
      kind,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      invoice_id: invoiceId,
      invoice_url: invoiceUrl,
      paid_at: new Date().toISOString(),
    });

    // Fire-and-forget confirmation (email + whatsapp). Don't block payment success.
    try {
      await admin.functions.invoke('razorpay-send-confirmation', {
        body: {
          payment_id: razorpay_payment_id,
          kind,
          recipient_email: learnerEmail,
          recipient_name: learnerName,
          recipient_phone: learnerPhone,
          item_title: itemTitle,
          amount: orderRow.amount,
          currency: orderRow.currency,
          invoice_url: invoiceUrl,
        },
      });
    } catch (e) {
      console.warn('confirmation invoke failed (non-blocking)', (e as Error).message);
    }

    return new Response(JSON.stringify({ success: true, enrollment_id: enrollmentId, webinar_registration_id: webinarRegId, digital_product_order_id: digitalProductOrderId, invoice_url: invoiceUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('verify-payment error', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
