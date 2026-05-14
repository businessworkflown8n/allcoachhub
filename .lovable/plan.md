# WhatsApp Dashboard Module — Full Build Plan

## Goal
Production-grade multi-tenant WhatsApp module: each coach gets a dedicated branded portal at `/wa/:coachSlug`, admin controls access + credits, Meta WhatsApp Cloud API powers real sending, Razorpay + Stripe top up credits, and a premium dark-mode WhatsApp-style UI handles bulk send, scheduling, CRM inbox, automation, templates, and analytics.

## Architecture decision
- **Auth:** reuse Supabase auth (RLS, roles, password reset already work). Each coach gets a branded sub-portal `/wa/:coachSlug` with its own login screen — same auth backend, isolated UX. This is what "separate login per coach" means in practice without duplicating password storage.
- **Tenancy:** all WhatsApp data scoped by `coach_id` via RLS. Already partially in place.
- **Sending:** all Meta Cloud API calls go through edge functions — never from the browser.

## Phase A — Data + access control (DB + admin)
New / extended tables:
- `whatsapp_access` — extend with `meta_phone_number_id`, `meta_waba_id`, `meta_display_name`, `is_approved`, `approved_at`
- `whatsapp_credits` — `coach_id`, `balance`, `monthly_quota`, `reset_at`, `last_reset_at`
- `whatsapp_credit_transactions` — `coach_id`, `delta`, `reason` (`topup|send|refund|admin_grant|monthly_reset`), `campaign_id?`, `payment_id?`, `balance_after`
- `whatsapp_subscription_plans` — `name`, `monthly_messages`, `price_inr`, `price_usd`, `features jsonb`, `is_active`
- `whatsapp_coach_subscriptions` — `coach_id`, `plan_id`, `status`, `current_period_end`, `provider` (`razorpay|stripe`), `provider_subscription_id`
- Extend `whatsapp_campaigns` — add `scheduled_at`, `template_variables jsonb`, `status` enum widening
- `whatsapp_conversations` — `coach_id`, `contact_id`, `wa_phone`, `last_message_at`, `unread_count`, `assigned_to`
- `whatsapp_messages` — `conversation_id`, `direction` (`inbound|outbound`), `wa_message_id`, `content`, `media_url`, `template_id`, `status`, `error`
- `whatsapp_automations` — `coach_id`, `trigger_type` (`keyword|new_contact|enrollment|inactivity`), `trigger_config jsonb`, `actions jsonb`, `is_active`
- `whatsapp_automation_runs` — execution log
- DB function `wa_consume_credit(coach_id, count)` — atomic deduction with row lock
- DB function `wa_admin_grant_credits(coach_id, amount, reason)` — admin only via `has_role`
- All tables: RLS = coach owns own rows + admin sees all via `has_role(auth.uid(),'admin')`

## Phase B — Edge functions (Meta Cloud API)
Secrets needed: `META_WHATSAPP_ACCESS_TOKEN`, `META_WHATSAPP_APP_SECRET` (webhook verify), `META_WHATSAPP_VERIFY_TOKEN`
Per-coach values stored in `whatsapp_access` row (phone number id, WABA id).

Functions:
- `wa-send-message` — single send, deducts credit, writes to `whatsapp_messages`
- `wa-send-bulk` — campaign runner, batches, schedules via pg_cron
- `wa-webhook` — receives delivery + read + inbound from Meta, updates `whatsapp_messages`/`whatsapp_conversations`, triggers automations
- `wa-template-sync` — pulls coach's approved templates from Meta
- `wa-automation-engine` — evaluates triggers, executes action chain (with optional Lovable AI reply via google/gemini-2.5-flash)
- `wa-credits-topup-razorpay` — order create + verify
- `wa-credits-topup-stripe` — checkout session + webhook
- `wa-subscribe-razorpay` / `wa-subscribe-stripe` — recurring plan
- `wa-monthly-reset` — pg_cron, resets monthly quota credits

All use Deno std 0.190.0, manual `corsHeaders`, JWT verify in code.

## Phase C — Coach UI at `/wa/:coachSlug`
New layout `WhatsAppPortalLayout` — dark, sidebar-driven, WhatsApp green accents over neon lime base.
Pages:
- `/wa/:slug/login` — branded login, shows coach's institute name + logo
- `/wa/:slug` — dashboard (credits widget, today's sends, delivery rate, active campaigns)
- `/wa/:slug/inbox` — split-pane WhatsApp-style CRM: conversations list + chat thread + contact panel; realtime via Supabase channel on `whatsapp_messages`
- `/wa/:slug/campaigns` — list + builder (audience picker, template + variables, schedule, preview)
- `/wa/:slug/templates` — gallery + Meta sync + create-template form
- `/wa/:slug/contacts` — table, CSV import, tags
- `/wa/:slug/automations` — visual trigger→action builder, AI reply toggle
- `/wa/:slug/analytics` — chart.js cards: sent/delivered/read/clicked/replied + top templates + cost
- `/wa/:slug/billing` — current plan, credit balance, top-up (Razorpay/Stripe), invoice history

Animations: framer-motion already in deps; subtle fade/slide on cards, message bubbles slide-in.

## Phase D — Admin panel additions
New tab in `AdminDashboard` → "WhatsApp Control":
- Coach list with toggle `whatsapp_access.is_active` and `is_approved`
- Credit allocator (grant N credits, set monthly quota, reason field)
- Subscription plan CRUD
- Campaign monitor (all coaches, status filter)
- Usage report (per coach: sent/delivered/cost/credits used in date range — uses GlobalDateRangePicker)
- Approval queue for new WhatsApp connections (Meta WABA verification)
- Billing controls (refund credits, comp plan)

## Phase E — Payments
Razorpay (existing infra reused) + Stripe BYOK.
- New Razorpay edge function for credit packs + plan subscription
- New Stripe edge function (`wa-credits-topup-stripe`, webhook handler)
- Will request `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` when ready

## Phase F — AI automation
- Use Lovable AI Gateway (`google/gemini-2.5-flash`) via existing `LOVABLE_API_KEY`
- Automation action `ai_reply` — passes inbound message + last 10 turns + coach's persona
- Chatbot-style auto-responder when coach offline, with handoff trigger

## Files (~45)
**Migrations (1):** one mega-migration for all tables + RLS + functions
**Edge functions (10):** as listed in Phase B
**Coach portal (15):** layout + 9 pages + 5 shared components (CreditWidget, MessageBubble, ConversationListItem, TemplatePicker, AutomationNode)
**Admin (6):** WhatsAppControl tab + 5 sub-components
**Hooks (4):** useWhatsAppCredits, useWhatsAppRealtime, useCoachWaConfig, useWaSubscription
**Routing (2):** App.tsx routes + a coach slug resolver
**Types update:** auto-regen after migration

## Risk callouts
1. Meta requires pre-approved message templates for outbound to non-opted-in users. Coaches must register templates via Meta Business Manager first; we sync them.
2. Webhook URL must be HTTPS + reachable — uses Supabase edge function URL, registered in Meta app dashboard manually after first deploy.
3. Stripe webhook signing secret — needed before live Stripe top-ups work.
4. ~45 files in one go is heavy; if anything breaks during build I'll fix forward, not rebuild.

## Sequencing within "all at once"
1. Migration (request approval)
2. Secrets request (Meta credentials)
3. Edge functions
4. Coach portal UI
5. Admin panel additions
6. Stripe wiring (when key provided)

Approve to proceed.
