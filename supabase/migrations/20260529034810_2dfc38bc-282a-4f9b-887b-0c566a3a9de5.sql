
-- 1. Fix messages table: remove overly-broad broadcast policies
DROP POLICY IF EXISTS "Authenticated users can receive broadcasts" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can send broadcasts" ON public.messages;

-- Ensure proper owner-scoped policies exist (idempotent)
DROP POLICY IF EXISTS "Users can read own messages" ON public.messages;
CREATE POLICY "Users can read own messages"
ON public.messages
FOR SELECT
TO authenticated
USING (sender_id = auth.uid() OR receiver_id = auth.uid());

DROP POLICY IF EXISTS "Users can send messages as themselves" ON public.messages;
CREATE POLICY "Users can send messages as themselves"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (sender_id = auth.uid());

-- 2. Fix learner_notifications: restrict inserts to service role or admins
DROP POLICY IF EXISTS "Service can insert notifications" ON public.learner_notifications;

CREATE POLICY "Service role or admins can insert notifications"
ON public.learner_notifications
FOR INSERT
TO public
WITH CHECK (
  auth.role() = 'service_role'
  OR public.has_role(auth.uid(), 'admin'::app_role)
);
