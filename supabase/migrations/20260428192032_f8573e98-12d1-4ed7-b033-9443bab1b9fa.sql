INSERT INTO public.features_master (feature_key, name, description, category, depends_on)
VALUES
  ('ai_agent_engine','AI Agent Engine','Master switch for the conversational AI agent pipeline.','ai',NULL),
  ('agent_skill_sales','Agent Sales Skill','Enables sales/buying-intent behavior with CTA.','ai',ARRAY['ai_agent_engine']),
  ('agent_skill_support','Agent Support Skill','Enables structured support and escalation logic.','ai',ARRAY['ai_agent_engine']),
  ('agent_knowledge_base','Agent Knowledge Base','Allows agent to use provided knowledge_context.','ai',ARRAY['ai_agent_engine']),
  ('agent_custom_instructions','Agent Custom Instructions','Honors admin/coach custom instructions list.','ai',ARRAY['ai_agent_engine']),
  ('agent_memory','Agent Memory','Uses prior conversation history for context.','ai',ARRAY['ai_agent_engine']),
  ('agent_language_switch','Agent Language Switch','Allows multilingual responses based on agent_config.','ai',ARRAY['ai_agent_engine'])
ON CONFLICT (feature_key) DO UPDATE
  SET name = EXCLUDED.name, description = EXCLUDED.description, category = EXCLUDED.category, depends_on = EXCLUDED.depends_on;

INSERT INTO public.feature_controls (feature_key, global_enabled, free_enabled, pro_enabled, premium_enabled, free_usage_limit, pro_usage_limit, premium_usage_limit)
VALUES
  ('ai_agent_engine',true,true,true,true,50,500,5000),
  ('agent_skill_sales',true,true,true,true,NULL,NULL,NULL),
  ('agent_skill_support',true,true,true,true,NULL,NULL,NULL),
  ('agent_knowledge_base',true,true,true,true,NULL,NULL,NULL),
  ('agent_custom_instructions',true,true,true,true,5,20,20),
  ('agent_memory',true,false,true,true,NULL,NULL,NULL),
  ('agent_language_switch',true,false,true,true,NULL,NULL,NULL)
ON CONFLICT (feature_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.ai_agent_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  coach_id uuid,
  session_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  intent_type text,
  conversion_probability numeric,
  escalation_flag boolean DEFAULT false,
  mode text DEFAULT 'live' CHECK (mode IN ('live','test')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_agent_conv_session_idx ON public.ai_agent_conversations (session_id, created_at);
CREATE INDEX IF NOT EXISTS ai_agent_conv_user_idx ON public.ai_agent_conversations (user_id, created_at DESC);

ALTER TABLE public.ai_agent_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own agent conversations" ON public.ai_agent_conversations;
CREATE POLICY "Users read own agent conversations"
  ON public.ai_agent_conversations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users insert own agent conversations" ON public.ai_agent_conversations;
CREATE POLICY "Users insert own agent conversations"
  ON public.ai_agent_conversations FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());