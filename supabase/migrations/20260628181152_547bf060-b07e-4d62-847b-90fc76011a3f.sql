
-- 1) drive_connections: hide raw OAuth tokens from client API
REVOKE SELECT (access_token, refresh_token) ON public.drive_connections FROM authenticated, anon;

-- 2) gsc_connections: hide raw OAuth tokens from client API
REVOKE SELECT (access_token, refresh_token) ON public.gsc_connections FROM authenticated, anon;

-- 3) report_sharing_requests: hide access_token from client API
REVOKE SELECT (access_token) ON public.report_sharing_requests FROM authenticated, anon;

-- 4) webinars: hide webinar_link from public/general clients; use get_owner_webinar_link RPC
REVOKE SELECT (webinar_link) ON public.webinars FROM anon, authenticated;

-- 5) profiles: hide contact PII from anonymous visitors
REVOKE SELECT (contact_number, whatsapp_number, email, linkedin_profile) ON public.profiles FROM anon;

-- 6) ai_kids_enrollments: tighten anonymous insert with field validation
DROP POLICY IF EXISTS "Anyone can submit enrollment" ON public.ai_kids_enrollments;
CREATE POLICY "Anyone can submit enrollment"
  ON public.ai_kids_enrollments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    consent_accepted = true
    AND length(btrim(student_name)) BETWEEN 1 AND 120
    AND length(btrim(parent_name)) BETWEEN 1 AND 120
    AND length(btrim(school_name)) BETWEEN 1 AND 200
    AND length(btrim(city)) BETWEEN 1 AND 100
    AND length(btrim(student_class)) BETWEEN 1 AND 40
    AND length(btrim(medium_of_education)) BETWEEN 1 AND 60
    AND length(btrim(enrolled_by)) BETWEEN 1 AND 60
    AND length(btrim(interested_course)) BETWEEN 1 AND 120
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND length(email) <= 254
    AND mobile_number ~ '^[0-9]{6,15}$'
    AND (whatsapp_number IS NULL OR whatsapp_number ~ '^[0-9]{6,15}$')
    AND (learning_reason IS NULL OR length(learning_reason) <= 2000)
    AND lead_status = 'NEW'
    AND assigned_coach_id IS NULL
    AND notes IS NULL
    AND last_contacted_date IS NULL
  );

-- 7) chat_history: lock INSERT to the lead owner; allow owner SELECT
DROP POLICY IF EXISTS "Authenticated users insert chat for valid lead" ON public.chat_history;
CREATE POLICY "Lead owner inserts chat"
  ON public.chat_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chatbot_leads cl
      WHERE cl.id = chat_history.lead_id
        AND cl.user_id = auth.uid()
    )
  );

CREATE POLICY "Lead owner views own chat"
  ON public.chat_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chatbot_leads cl
      WHERE cl.id = chat_history.lead_id
        AND cl.user_id = auth.uid()
    )
  );

-- 8) coach_blueprints: hide proprietary AI outputs from public share view
REVOKE SELECT (
  niche_inputs, niche_output, avatar_inputs, avatar_output, problems_output,
  offer_inputs, offer_output, pricing_inputs, pricing_output,
  curriculum_output, funnel_output, roadmap_output, dashboard_state
) ON public.coach_blueprints FROM anon;

-- 9) enrollments: drop duplicated/unused razorpay columns (real source-of-truth is payments table)
ALTER TABLE public.enrollments
  DROP COLUMN IF EXISTS razorpay_order_id,
  DROP COLUMN IF EXISTS razorpay_payment_id;

-- 10) quiz_questions: ensure no anon/learner SELECT (already coach-only via policy);
-- explicitly revoke broad table SELECT from anon to remove any latent risk.
REVOKE SELECT ON public.quiz_questions FROM anon;
