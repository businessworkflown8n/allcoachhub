
DROP VIEW IF EXISTS public.course_leaderboard_v;
CREATE VIEW public.course_leaderboard_v WITH (security_invoker = true) AS
SELECT
  a.course_id,
  s.user_id,
  COUNT(DISTINCT s.assignment_id) AS submitted_count,
  COUNT(DISTINCT s.assignment_id) FILTER (WHERE s.status IN ('approved','reviewed') OR s.evaluation_status = 'pass') AS completed_count,
  COALESCE(SUM(s.score), 0) AS total_score,
  COALESCE(AVG(NULLIF(s.score, 0))::numeric(10,2), 0) AS avg_score,
  MAX(s.submitted_at) AS last_submitted_at,
  (SELECT COUNT(*) FROM public.assignments a2 WHERE a2.course_id = a.course_id AND a2.status = 'published') AS total_published,
  RANK() OVER (
    PARTITION BY a.course_id
    ORDER BY COALESCE(SUM(s.score), 0) DESC, MAX(s.submitted_at) ASC
  ) AS rank_position
FROM public.assignment_submissions s
JOIN public.assignments a ON a.id = s.assignment_id
GROUP BY a.course_id, s.user_id;

GRANT SELECT ON public.course_leaderboard_v TO authenticated;
