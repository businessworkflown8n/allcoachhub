CREATE TABLE public.ai_kids_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id text UNIQUE NOT NULL DEFAULT ('AIK-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  student_name text NOT NULL,
  student_class text NOT NULL,
  school_name text NOT NULL,
  medium_of_education text NOT NULL,
  city text NOT NULL,
  enrolled_by text NOT NULL,
  parent_name text NOT NULL,
  mobile_country_code text NOT NULL DEFAULT '+91',
  mobile_number text NOT NULL,
  whatsapp_country_code text,
  whatsapp_number text,
  email text NOT NULL,
  interested_course text NOT NULL,
  has_laptop boolean NOT NULL DEFAULT false,
  learning_reason text,
  consent_accepted boolean NOT NULL DEFAULT false,
  lead_status text NOT NULL DEFAULT 'NEW',
  assigned_coach_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  last_contacted_date timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.ai_kids_enrollments TO anon;
GRANT INSERT, SELECT, UPDATE ON public.ai_kids_enrollments TO authenticated;
GRANT ALL ON public.ai_kids_enrollments TO service_role;

ALTER TABLE public.ai_kids_enrollments ENABLE ROW LEVEL SECURITY;

-- Public can submit
CREATE POLICY "Anyone can submit enrollment"
  ON public.ai_kids_enrollments FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admins full read
CREATE POLICY "Admins can view all enrollments"
  ON public.ai_kids_enrollments FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins full update
CREATE POLICY "Admins can update enrollments"
  ON public.ai_kids_enrollments FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins delete
CREATE POLICY "Admins can delete enrollments"
  ON public.ai_kids_enrollments FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Coaches can view their assigned leads
CREATE POLICY "Coaches view assigned leads"
  ON public.ai_kids_enrollments FOR SELECT
  TO authenticated
  USING (assigned_coach_id = auth.uid());

-- Coaches can update their assigned leads
CREATE POLICY "Coaches update assigned leads"
  ON public.ai_kids_enrollments FOR UPDATE
  TO authenticated
  USING (assigned_coach_id = auth.uid())
  WITH CHECK (assigned_coach_id = auth.uid());

CREATE INDEX idx_ai_kids_enrollments_status ON public.ai_kids_enrollments(lead_status);
CREATE INDEX idx_ai_kids_enrollments_coach ON public.ai_kids_enrollments(assigned_coach_id);
CREATE INDEX idx_ai_kids_enrollments_created ON public.ai_kids_enrollments(created_at DESC);

CREATE TRIGGER update_ai_kids_enrollments_updated_at
  BEFORE UPDATE ON public.ai_kids_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();