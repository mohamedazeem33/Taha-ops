-- Migration: Audit Fixes for Points, Streak Idempotency, and Points Log Index

-- 1. get_employee_points: Add authorization check and default to caller
CREATE OR REPLACE FUNCTION public.get_employee_points(p_employee_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_target_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_target_id := COALESCE(p_employee_id, auth.uid());

  IF auth.uid() != v_target_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN COALESCE(
    (SELECT SUM(points) FROM public.points_log WHERE employee_id = v_target_id),
    0
  )::integer;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_employee_points(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_employee_points(uuid) TO authenticated;

-- 2. evaluate_streak: Make idempotent
CREATE OR REPLACE FUNCTION public.evaluate_streak(p_employee_id uuid, p_task_date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_total integer;
  v_completed integer;
  v_missed integer;
  v_late integer;
  v_current integer;
  v_best integer;
  v_last_date date;
  v_gap_had_tasks boolean;
BEGIN
  SELECT count(*) INTO v_total
  FROM public.tasks WHERE assigned_to = p_employee_id AND task_date = p_task_date;
  IF v_total = 0 THEN RETURN; END IF;

  SELECT count(*) INTO v_completed
  FROM public.tasks WHERE assigned_to = p_employee_id AND task_date = p_task_date AND status = 'completed';

  SELECT count(*) INTO v_missed
  FROM public.tasks WHERE assigned_to = p_employee_id AND task_date = p_task_date AND status = 'missed';

  SELECT count(*) INTO v_late
  FROM public.tasks
  WHERE assigned_to = p_employee_id AND task_date = p_task_date
    AND status = 'completed' AND done_at > deadline;

  IF v_completed + v_missed < v_total THEN RETURN; END IF;

  SELECT current_streak, best_streak, last_streak_date
  INTO v_current, v_best, v_last_date
  FROM public.employee_streaks WHERE employee_id = p_employee_id;
  IF NOT FOUND THEN v_current := 0; v_best := 0; v_last_date := NULL; END IF;

  -- Idempotency check: if last_streak_date already equals the date being evaluated,
  -- this date was already counted in the streak. Return without altering current or best streak.
  IF v_last_date IS NOT NULL AND v_last_date >= p_task_date THEN
    RETURN;
  END IF;

  IF v_missed > 0 OR v_late > 0 THEN
    v_current := 0;
    v_last_date := NULL;
  ELSIF v_completed = v_total AND v_late = 0 THEN
    IF v_last_date IS NULL THEN
      v_current := 1;
    ELSIF v_last_date = p_task_date - 1 THEN
      v_current := v_current + 1;
    ELSE
      SELECT EXISTS(
        SELECT 1 FROM public.tasks
        WHERE assigned_to = p_employee_id
          AND task_date > v_last_date AND task_date < p_task_date
      ) INTO v_gap_had_tasks;
      IF NOT v_gap_had_tasks THEN
        v_current := v_current + 1;
      ELSE
        v_current := 1;
      END IF;
    END IF;
    v_last_date := p_task_date;
    IF v_current > v_best THEN v_best := v_current; END IF;
  END IF;

  INSERT INTO public.employee_streaks (employee_id, current_streak, best_streak, last_streak_date)
  VALUES (p_employee_id, v_current, v_best, v_last_date)
  ON CONFLICT (employee_id) DO UPDATE
  SET current_streak = v_current, best_streak = v_best, last_streak_date = v_last_date;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.evaluate_streak(uuid, date) FROM PUBLIC, anon;

-- 3. Composite Index on points_log (employee_id, created_at)
CREATE INDEX IF NOT EXISTS idx_points_log_employee_created ON public.points_log (employee_id, created_at);

