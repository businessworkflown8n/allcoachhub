ALTER TABLE public.coach_websites
ADD COLUMN IF NOT EXISTS section_order JSONB
DEFAULT '[
  {"id":"hero","visible":true},
  {"id":"stats","visible":true},
  {"id":"about","visible":true},
  {"id":"usp","visible":true},
  {"id":"courses","visible":true},
  {"id":"coach_profile","visible":true},
  {"id":"video","visible":false},
  {"id":"testimonials","visible":true},
  {"id":"demo","visible":true},
  {"id":"faq","visible":true},
  {"id":"social","visible":true},
  {"id":"final_cta","visible":true}
]'::jsonb;