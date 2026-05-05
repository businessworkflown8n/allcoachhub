-- Add new feature keys for SaaS feature control system
-- Categories: gamification, events, marketing, team, certificates, automation, integrations

INSERT INTO public.features_master (feature_key, name, description, category, sort_order, is_active, supports_usage_limit) VALUES
  -- Gamification
  ('gamification_points', 'Points System', 'Award and track learner points', 'gamification', 100, true, false),
  ('gamification_badges', 'Badges', 'Custom badges and achievements', 'gamification', 101, true, false),
  ('gamification_leaderboard', 'Leaderboard', 'Public/private leaderboards', 'gamification', 102, true, false),
  ('gamification_settings', 'Gamification Settings', 'Configure points rules and triggers', 'gamification', 103, true, false),
  -- Events / 1:1
  ('events_management', '1:1 Consultation Events', 'Schedule and manage 1:1 sessions', 'events', 200, true, false),
  ('calendar_integration', 'Calendar Integration', 'Sync with Google/Outlook calendar', 'events', 201, true, false),
  ('slot_booking', 'Slot Booking', 'Allow learners to book time slots', 'events', 202, true, false),
  ('overlap_booking', 'Overlap Booking', 'Allow overlapping bookings', 'events', 203, true, false),
  -- Coupons
  ('coupons_management', 'Coupon Management', 'Create and manage coupons', 'marketing', 300, true, true),
  ('coupon_creation', 'Coupon Creation', 'Create new coupon codes', 'marketing', 301, true, false),
  ('coupon_activation', 'Coupon Activation', 'Activate/deactivate coupons', 'marketing', 302, true, false),
  ('coupon_tracking', 'Coupon Tracking', 'Track coupon redemptions', 'marketing', 303, true, false),
  -- Team
  ('team_management', 'Team Management', 'Add and manage team members', 'team', 400, true, true),
  ('team_permissions', 'Team Permissions', 'Granular role permissions', 'team', 401, true, false),
  ('team_roles', 'Team Roles', 'Custom roles for team', 'team', 402, true, false),
  -- Certificates
  ('certificates_templates', 'Certificate Templates', 'Custom certificate designs', 'certificates', 500, true, false),
  ('certificate_generation', 'Certificate Generation', 'Auto-generate certificates', 'certificates', 501, true, true),
  ('certificate_distribution', 'Certificate Distribution', 'Email and download delivery', 'certificates', 502, true, false),
  -- WhatsApp
  ('whatsapp_automation', 'WhatsApp Automation', 'Automated WhatsApp flows', 'automation', 600, true, true),
  ('whatsapp_notifications', 'WhatsApp Notifications', 'Transactional notifications', 'automation', 601, true, false),
  ('whatsapp_reminders', 'WhatsApp Reminders', 'Scheduled reminders', 'automation', 602, true, false),
  -- Integrations
  ('gtm_integration', 'Google Tag Manager', 'GTM container integration', 'integrations', 700, true, false),
  ('meta_capi', 'Meta Conversion API', 'Server-side Meta CAPI', 'integrations', 701, true, false),
  ('pabbly_connect', 'Pabbly Connect', 'Pabbly webhook integration', 'integrations', 702, true, false)
ON CONFLICT (feature_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Seed feature_controls (default OFF globally — admin must explicitly enable)
INSERT INTO public.feature_controls (feature_key, global_enabled, free_enabled, pro_enabled, premium_enabled)
SELECT feature_key, false, false, false, true
FROM public.features_master
WHERE feature_key IN (
  'gamification_points','gamification_badges','gamification_leaderboard','gamification_settings',
  'events_management','calendar_integration','slot_booking','overlap_booking',
  'coupons_management','coupon_creation','coupon_activation','coupon_tracking',
  'team_management','team_permissions','team_roles',
  'certificates_templates','certificate_generation','certificate_distribution',
  'whatsapp_automation','whatsapp_notifications','whatsapp_reminders',
  'gtm_integration','meta_capi','pabbly_connect'
)
ON CONFLICT (feature_key) DO NOTHING;