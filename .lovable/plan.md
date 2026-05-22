# Payments — close the gaps end-to-end

## Decisions locked in
- Provider: **Stripe** (seamless, via Lovable Cloud). Razorpay code in repo stays untouched as a future option.
- Currency: **INR for buyers in India, USD elsewhere** (both via Stripe). No Razorpay yet.
- Tax: **Auto calculation & collection** (+0.5%).
- Scope: subscriptions, courses, paid webinars.
- Cancellation: access until `current_period_end`.

## What gets built

### 1. Database (one migration)
- New table `stripe_subscriptions` (user_id, stripe_subscription_id, stripe_customer_id, product_id, price_id, status, period start/end, cancel_at_period_end, environment) + RLS (user sees own; service role manages).
- New column `subscription_plans.stripe_product_slug` (text) — maps DB plan to Stripe product (`starter_plan` / `pro_plan` / `premium_plan` / `corporate_plan`). Backfilled.
- New column `subscription_plans.price_usd` (numeric) — USD equivalents ($12 / $36 / $72 / $180).
- `payments.enrollment_id` becomes **nullable** so subscription payments can also be logged.
- New columns on `payments`: `stripe_session_id`, `stripe_subscription_id`, `kind` ('course' | 'webinar' | 'subscription').
- Trigger: when `stripe_subscriptions.status` flips to `active`/`trialing` → upsert matching `coach_subscriptions` row (links coach to plan tier so `useCoachPlan` unlocks features automatically).
- `has_active_subscription(user_uuid, env)` SQL helper.

### 2. Stripe products (already created last turn)
4 subscription products × monthly/yearly in USD. Course & webinar checkouts use **dynamic `price_data`** (per-row pricing) — no per-course product pollution.

### 3. Edge functions
- `_shared/stripe.ts` — `createStripeClient(env)` gateway wrapper + `verifyWebhook`.
- `create-checkout` — subscription mode (resolves by `lookup_key`) OR one-off mode (course/webinar with `price_data` in INR or USD based on buyer country). Sets `automatic_tax: { enabled: true }`. Resolves/creates Stripe Customer with `metadata.userId`. Returns `clientSecret` for Embedded Checkout.
- `payments-webhook` — handles `customer.subscription.{created,updated,deleted}` and `checkout.session.completed`. For one-off payments: marks `enrollments.payment_status='completed'`, sets `payment_locked=true`, inserts `payments` row, fires `send-payment-confirmation`. For webinar one-offs: updates `webinar_payments` + creates `webinar_registrations`. Idempotent via upserts.
- `create-portal-session` — auth-gated, opens Stripe customer portal for cancel / payment method / invoices.

### 4. Frontend
- `src/lib/stripe.ts` — `getStripe()` + `getStripeEnvironment()`.
- `src/lib/currencyRouter.ts` — detects buyer country via `cdn-cgi/trace`, returns `'INR' | 'USD'`. Cached in localStorage.
- `src/components/PaymentTestModeBanner.tsx` — renders only when sandbox token detected; mounted at app root.
- `src/components/StripeEmbeddedCheckout.tsx` + `src/hooks/useStripeCheckout.tsx`.
- `src/pages/CheckoutReturn.tsx` at route `/checkout/return` — reads `session_id`, shows success state, refreshes user data.
- **Wire-ups**:
  - `CoachSubscription` → "Switch to {Plan}" buttons call `openCheckout({ priceId: '<plan>_<cycle>' })`. Adds "Manage billing" button → `create-portal-session`.
  - `PlanUpgradeModal` → "Subscribe" button per plan/cycle calls `openCheckout`.
  - `Enroll.tsx` → after inserting pending enrollment, opens checkout with `price_data` (course title + price in resolved currency). Removes the misleading "Proceed to Payment" dead-end.
  - `Webinars.tsx` / `LearnerWebinars.tsx` → for paid webinars, opens checkout before creating registration; webhook completes the registration.
- **Status surface**:
  - Coach dashboard banner when `status='past_due'` ("Payment failed — update your card") with portal link.
  - Coach dashboard banner when `cancel_at_period_end=true` ("Access ends on {date}") with reactivate CTA.

### 5. Memory update
- Replace the stale "Razorpay payments" memory with a "Stripe payments" memory describing the new architecture, and re-flag Razorpay as "not yet integrated; future option".

## Files affected (≈18)
**New**: 1 migration, 4 edge functions (incl. `_shared/stripe.ts`), 4 frontend files, 1 page.
**Edited**: `CoachSubscription.tsx`, `PlanUpgradeModal.tsx`, `Enroll.tsx`, `Webinars.tsx`, `LearnerWebinars.tsx`, `App.tsx` (route + banner), `supabase/config.toml` (verify_jwt=false for 3 payment functions), memory index.

## How to test in preview

Stripe is in sandbox/test mode — no real money moves. The orange "test mode" banner will appear at the top of every page.

**Test cards** (any future expiry, any 3-digit CVC, any postal code):
| Card | Result |
|------|--------|
| `4242 4242 4242 4242` | Success |
| `4000 0025 0000 3155` | 3D-Secure challenge → success |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0000 0000 0341` | Charges but fails on subscription renewal (great for dunning) |

**Subscription flow**
1. Sign in as a coach → `/coach/subscription` → click "Switch to Pro" → embedded checkout opens inline.
2. Pay with `4242…` → return page → `coach_subscriptions` row should now show Pro, premium features unlock immediately.
3. Click "Manage billing" → Stripe portal opens in a new tab → cancel → return to app → "Access ends on {date}" banner appears, features stay unlocked until period end.

**Course flow**
1. Open a course → `/enroll/:id` → fill form → checkout opens (INR if you're in India, USD otherwise).
2. Pay → return page → `/learner` shows the enrollment with `payment_status='completed'`; confirmation email arrives via Resend.

**Webinar flow**
1. Register for a paid webinar → checkout → pay → `webinar_registrations` + `webinar_payments` rows are created by the webhook.

**Failure path**
1. Use `4000…9995` → checkout shows decline → no DB rows are written.
2. Use `4000…0341` for a subscription → first charge succeeds, then renewal fails → coach sees the "Payment failed" banner.

## Out of scope (flag for later)
- Razorpay path (codebase will still be ready when you go live in India with native INR settlement).
- Coupons (`coupons` table exists but isn't applied at checkout).
- Proration on plan switch (Stripe handles by default; we'll surface it in UI in a follow-up).
