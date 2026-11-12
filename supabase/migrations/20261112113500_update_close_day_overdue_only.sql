-- Migration: Update close_day to only mark overdue tasks as missed
-- Tasks with deadlines still in the future (or waiting for confirmation) stay open.
-- Unfinished tasks from the chosen date or earlier are evaluated.

CREATE OR REPLACE FUNCTION close_day(p_day date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer := 0;
  v_updates jsonb;
  v_rec record;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can close the day';
  END IF;

  -- 1. Mark as missed ONLY open tasks for p_day or earlier whose deadline has passed.
  -- Tasks with deadline in the future, or in 'done_pending' / 'completed', stay untouched.
  WITH updated AS (
    UPDATE public.tasks
    SET status = 'missed'
    WHERE task_date <= p_day
      AND status IN ('assigned', 'rejected')
      AND deadline <= now()
    RETURNING assigned_to, task_date
  )
  SELECT 
    count(*)::integer,
    COALESCE(jsonb_agg(jsonb_build_object('emp', assigned_to, 'dt', task_date)), '[]'::jsonb)
  INTO v_count, v_updates
  FROM updated;

  -- 2. Evaluate streak and badges ONLY for:
  --    a) Employees and dates that were newly marked missed in this call
  --    b) Plus employees on the chosen date (p_day)
  -- Deduplicated via UNION so no employee and date is evaluated twice.
  -- Does NOT loop over older historical missed tasks.
  FOR v_rec IN
    WITH newly_missed AS (
      SELECT DISTINCT (item->>'emp')::uuid AS employee_id, (item->>'dt')::date AS task_date
      FROM jsonb_array_elements(v_updates) AS item
    ),
    chosen_day_employees AS (
      SELECT DISTINCT assigned_to AS employee_id, p_day AS task_date
      FROM public.tasks
      WHERE task_date = p_day
    ),
    targets AS (
      SELECT employee_id, task_date FROM newly_missed
      UNION
      SELECT employee_id, task_date FROM chosen_day_employees
    )
    SELECT employee_id, task_date FROM targets
  LOOP
    PERFORM public.evaluate_streak(v_rec.employee_id, v_rec.task_date);
    PERFORM public.award_badges(v_rec.employee_id);
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION close_day(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION close_day(date) TO authenticated;
