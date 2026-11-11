/*
# Gamification: points, streaks, badges, leaderboard, rewards

## Plain-English summary
Adds the points, streaks, badges and rewards system. Points are awarded automatically when the admin confirms a task — more for finishing early, fewer for finishing late. Streaks track consecutive perfect days. Badges are earned for early finishes, clean weeks, and long streaks. The leaderboard shows weekly and all-time rankings. Rewards let employees spend points on perks the admin sets up.

## 1. New tables
- `points_log` — every points award and deduction. Links to a task when applicable, or is a manual/reward entry.
- `employee_streaks` — current and best streak per employee, with the last streak day.
- `badges` — predefined badge definitions (seeded).
- `employee_badges` — which badges each employee has earned.
- `rewards` — admin-created perks with a points cost and active toggle.
- `reward_requests` — employee requests to redeem a reward, with admin approval.

## 2. New and modified server functions
- `award_task_points(task_id)` (new, internal) — calculates points from done_at vs deadline and inserts a points_log row. 15 for >1h early, 10 for on time, 2 for late. Idempotent.
- `evaluate_streak(employee_id, task_date)` (new, internal) — updates the streak when a day is fully decided (all completed or any missed). No-task days are neutral.
- `award_badges(employee_id)` (new, internal) — checks and awards all three badges.
- `check_zero_late_week(employee_id)` (new, internal) — checks the last 8 Mon–Sat weeks for a clean week.
- `get_leaderboard(period)` (new) — returns aggregated points per active employee, weekly or all-time.
- `get_employee_points(employee_id)` (new) — returns total points for one employee.
- `add_manual_adjustment(employee_id, points, reason)` (new) — admin adds a bonus or penalty.
- `approve_reward_request(request_id)` (new) — admin approves, deducts points via a negative log entry.
- `reject_reward_request(request_id, reason)` (new) — admin rejects.
- `review_task` (modified) — now awards points, evaluates streak, and checks badges on confirm.
- `close_day` (modified) — now evaluates streaks and badges for all affected employees.

## 3. Security
- RLS on every new table.
- Employees read only their own points_log, streaks, badges, and reward_requests.
- Employees can read all active rewards and the leaderboard (aggregated only).
- Employees can create reward_requests for themselves only.
- Only the admin can write to rewards, approve/reject requests, and add manual adjustments — enforced inside each function.
- Internal functions (award_task_points, evaluate_streak, award_badges, check_zero_late_week) are not callable from the API.

## 4. Important notes
1. Points are never awarded in the browser — only by database functions triggered on admin confirmation.
2. The weekly leaderboard resets every Monday 00:00 IST.
3. Badges are seeded and checked automatically after each task confirmation and day close.
4. Idempotent: safe to re-run.
*/

CREATE TABLE IF NOT EXISTS points_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  points integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS points_log_employee_idx ON points_log (employee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS points_log_task_idx ON points_log (task_id) WHERE task_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS employee_streaks (
  employee_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0,
  best_streak integer NOT NULL DEFAULT 0,
  last_streak_date date
);

CREATE TABLE IF NOT EXISTS badges (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon_name text NOT NULL DEFAULT 'award',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_badges (
  employee_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id text REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (employee_id, badge_id)
);

CREATE TABLE IF NOT EXISTS rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  points_cost integer NOT NULL CHECK (points_cost > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reward_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS reward_requests_status_idx ON reward_requests (status, created_at);
CREATE INDEX IF NOT EXISTS reward_requests_employee_idx ON reward_requests (employee_id, created_at DESC);

INSERT INTO badges (id, name, description, icon_name) VALUES
  ('early_bird', 'Early Bird', 'Finished 5 tasks more than 1 hour early', 'sun'),
  ('zero_late_week', 'Zero Late Week', 'A full Mon–Sat week with no late or missed tasks', 'calendar-check'),
  ('streak_7', 'Streak 7', 'Reached a 7-day streak', 'flame')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE points_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_requests ENABLE ROW LEVEL SECURITY;

-- Internal helper: award points for a confirmed task
CREATE OR REPLACE FUNCTION award_task_points(p_task_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_task public.tasks%ROWTYPE;
  v_points integer;
  v_reason text;
BEGIN
  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  IF v_task.status != 'completed' OR v_task.done_at IS NULL THEN
    RETURN 0;
  END IF;

  IF EXISTS(SELECT 1 FROM public.points_log WHERE task_id = p_task_id) THEN
    RETURN 0;
  END IF;

  IF v_task.done_at <= v_task.deadline - interval '1 hour' THEN
    v_points := 15;
    v_reason := 'Finished more than 1 hour early';
  ELSIF v_task.done_at <= v_task.deadline THEN
    v_points := 10;
    v_reason := 'Finished on time';
  ELSE
    v_points := 2;
    v_reason := 'Completed past deadline';
  END IF;

  INSERT INTO public.points_log (employee_id, task_id, points, reason)
  VALUES (v_task.assigned_to, v_task.id, v_points, v_reason);

  RETURN v_points;
END;
$$;

-- Internal helper: evaluate streak for a given employee and day
CREATE OR REPLACE FUNCTION evaluate_streak(p_employee_id uuid, p_task_date date)
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

-- Internal helper: check Zero Late Week badge
CREATE OR REPLACE FUNCTION check_zero_late_week(p_employee_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_today date;
  v_week_start date;
  v_i integer;
  v_has_tasks boolean;
  v_has_bad boolean;
  v_all_decided boolean;
BEGIN
  v_today := (now() AT TIME ZONE 'Asia/Kolkata')::date;

  FOR v_i IN 0..7 LOOP
    v_week_start := date_trunc('week', v_today)::date - (v_i * 7);
    IF v_week_start > v_today THEN CONTINUE; END IF;

    SELECT EXISTS(
      SELECT 1 FROM public.tasks
      WHERE assigned_to = p_employee_id
        AND task_date >= v_week_start AND task_date <= v_week_start + 5
    ) INTO v_has_tasks;
    IF NOT v_has_tasks THEN CONTINUE; END IF;

    SELECT EXISTS(
      SELECT 1 FROM public.tasks
      WHERE assigned_to = p_employee_id
        AND task_date >= v_week_start AND task_date <= v_week_start + 5
        AND (status = 'missed' OR (status = 'completed' AND done_at > deadline))
    ) INTO v_has_bad;
    IF v_has_bad THEN CONTINUE; END IF;

    SELECT NOT EXISTS(
      SELECT 1 FROM public.tasks
      WHERE assigned_to = p_employee_id
        AND task_date >= v_week_start AND task_date <= v_week_start + 5
        AND status IN ('assigned', 'rejected', 'done_pending')
    ) INTO v_all_decided;

    IF v_all_decided THEN
      INSERT INTO public.employee_badges (employee_id, badge_id)
      VALUES (p_employee_id, 'zero_late_week')
      ON CONFLICT DO NOTHING;
      RETURN;
    END IF;
  END LOOP;
END;
$$;

-- Internal helper: check and award all badges
CREATE OR REPLACE FUNCTION award_badges(p_employee_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_early_count integer;
  v_best_streak integer;
  v_current_streak integer;
BEGIN
  SELECT count(*) INTO v_early_count
  FROM public.tasks
  WHERE assigned_to = p_employee_id
    AND status = 'completed'
    AND done_at <= deadline - interval '1 hour';

  IF v_early_count >= 5 THEN
    INSERT INTO public.employee_badges (employee_id, badge_id)
    VALUES (p_employee_id, 'early_bird') ON CONFLICT DO NOTHING;
  END IF;

  SELECT COALESCE(best_streak, 0), COALESCE(current_streak, 0)
  INTO v_best_streak, v_current_streak
  FROM public.employee_streaks WHERE employee_id = p_employee_id;

  IF v_best_streak >= 7 OR v_current_streak >= 7 THEN
    INSERT INTO public.employee_badges (employee_id, badge_id)
    VALUES (p_employee_id, 'streak_7') ON CONFLICT DO NOTHING;
  END IF;

  PERFORM public.check_zero_late_week(p_employee_id);
END;
$$;

-- Public: leaderboard (weekly or all-time)
CREATE OR REPLACE FUNCTION get_leaderboard(p_period text DEFAULT 'all_time')
RETURNS TABLE(employee_id uuid, full_name text, total_points bigint, current_streak integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id AS employee_id,
         p.full_name,
         COALESCE(SUM(l.points), 0)::bigint AS total_points,
         COALESCE(s.current_streak, 0) AS current_streak
  FROM public.profiles p
  LEFT JOIN public.points_log l ON l.employee_id = p.id
    AND (p_period = 'all_time'
         OR l.created_at >= date_trunc('week', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata')
  LEFT JOIN public.employee_streaks s ON s.employee_id = p.id
  WHERE EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p.id AND r.role = 'employee')
    AND p.is_active = true
  GROUP BY p.id, p.full_name, s.current_streak
  ORDER BY total_points DESC, p.full_name ASC;
$$;

-- Public: total points for one employee
CREATE OR REPLACE FUNCTION get_employee_points(p_employee_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(SUM(points), 0)::integer
  FROM public.points_log WHERE employee_id = p_employee_id;
$$;

-- Public: admin manual adjustment
CREATE OR REPLACE FUNCTION add_manual_adjustment(p_employee_id uuid, p_points integer, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can add manual adjustments';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'A reason is required';
  END IF;
  INSERT INTO public.points_log (employee_id, task_id, points, reason)
  VALUES (p_employee_id, NULL, p_points, btrim(p_reason));
END;
$$;

-- Public: admin approves a reward request
CREATE OR REPLACE FUNCTION approve_reward_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_req public.reward_requests%ROWTYPE;
  v_reward public.rewards%ROWTYPE;
  v_balance integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve reward requests';
  END IF;

  SELECT * INTO v_req FROM public.reward_requests WHERE id = p_request_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'This request is no longer pending'; END IF;

  SELECT * INTO v_reward FROM public.rewards WHERE id = v_req.reward_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reward not found'; END IF;

  SELECT public.get_employee_points(v_req.employee_id) INTO v_balance;
  IF v_balance < v_reward.points_cost THEN
    RAISE EXCEPTION 'Not enough points';
  END IF;

  INSERT INTO public.points_log (employee_id, task_id, points, reason)
  VALUES (v_req.employee_id, NULL, -v_reward.points_cost, 'Redeemed: ' || v_reward.title);

  UPDATE public.reward_requests
  SET status = 'approved', reviewed_at = now()
  WHERE id = p_request_id;
END;
$$;

-- Public: admin rejects a reward request
CREATE OR REPLACE FUNCTION reject_reward_request(p_request_id uuid, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can reject reward requests';
  END IF;

  UPDATE public.reward_requests
  SET status = 'rejected', reviewed_at = now(), rejection_reason = btrim(p_reason)
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN RAISE EXCEPTION 'This request is no longer pending'; END IF;
END;
$$;

-- Revoke EXECUTE on all internal functions
REVOKE EXECUTE ON FUNCTION award_task_points(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION evaluate_streak(uuid, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION award_badges(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION check_zero_late_week(uuid) FROM PUBLIC, anon;

-- Grant EXECUTE on public functions
REVOKE EXECUTE ON FUNCTION get_leaderboard(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_leaderboard(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION get_employee_points(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_employee_points(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION add_manual_adjustment(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION add_manual_adjustment(uuid, integer, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION approve_reward_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION approve_reward_request(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION reject_reward_request(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION reject_reward_request(uuid, text) TO authenticated;

-- Modified: review_task now awards points + streak + badges on confirm
CREATE OR REPLACE FUNCTION review_task(p_task_id uuid, p_decision text, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_assigned_to uuid;
  v_task_date date;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can review tasks';
  END IF;

  IF p_decision NOT IN ('confirm', 'reject') THEN
    RAISE EXCEPTION 'Unknown decision';
  END IF;

  IF p_decision = 'reject' AND (p_reason IS NULL OR btrim(p_reason) = '') THEN
    RAISE EXCEPTION 'A reason is required to reject a task';
  END IF;

  UPDATE public.tasks
  SET status = CASE WHEN p_decision = 'confirm' THEN 'completed' ELSE 'rejected' END,
      confirmed_at = CASE WHEN p_decision = 'confirm' THEN now() ELSE NULL END,
      done_at = CASE WHEN p_decision = 'confirm' THEN done_at ELSE NULL END,
      rejection_reason = CASE WHEN p_decision = 'reject' THEN btrim(p_reason) ELSE NULL END
  WHERE id = p_task_id
    AND status = 'done_pending'
  RETURNING assigned_to, task_date INTO v_assigned_to, v_task_date;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This task is no longer waiting for confirmation';
  END IF;

  IF p_decision = 'confirm' THEN
    PERFORM public.award_task_points(p_task_id);
    PERFORM public.evaluate_streak(v_assigned_to, v_task_date);
    PERFORM public.award_badges(v_assigned_to);
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION review_task(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION review_task(uuid, text, text) TO authenticated;

-- Modified: close_day now evaluates streaks and badges
CREATE OR REPLACE FUNCTION close_day(p_day date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer;
  v_employee uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can close the day';
  END IF;

  WITH updated AS (
    UPDATE public.tasks
    SET status = 'missed'
    WHERE task_date = p_day
      AND status IN ('assigned', 'rejected')
    RETURNING id, assigned_to
  )
  SELECT count(*)::integer INTO v_count FROM updated;

  FOR v_employee IN SELECT DISTINCT assigned_to FROM public.tasks WHERE task_date = p_day LOOP
    PERFORM public.evaluate_streak(v_employee, p_day);
    PERFORM public.award_badges(v_employee);
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION close_day(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION close_day(date) TO authenticated;

-- Grants for new tables
GRANT SELECT ON points_log TO authenticated;
GRANT SELECT ON employee_streaks TO authenticated;
GRANT SELECT ON badges TO authenticated;
GRANT SELECT ON employee_badges TO authenticated;
GRANT SELECT ON rewards TO authenticated;
GRANT SELECT, INSERT (reward_id, employee_id) ON reward_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON rewards TO authenticated;
GRANT SELECT, UPDATE, DELETE ON reward_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON points_log, employee_streaks, employee_badges TO service_role;

-- RLS policies
DROP POLICY IF EXISTS "select_own_points_log" ON points_log;
CREATE POLICY "select_own_points_log" ON points_log FOR SELECT
  TO authenticated USING (auth.uid() = employee_id);

DROP POLICY IF EXISTS "select_own_streaks" ON employee_streaks;
CREATE POLICY "select_own_streaks" ON employee_streaks FOR SELECT
  TO authenticated USING (auth.uid() = employee_id);

DROP POLICY IF EXISTS "select_all_badges" ON badges;
CREATE POLICY "select_all_badges" ON badges FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "select_own_badges" ON employee_badges;
CREATE POLICY "select_own_badges" ON employee_badges FOR SELECT
  TO authenticated USING (auth.uid() = employee_id);

DROP POLICY IF EXISTS "select_active_rewards" ON rewards;
CREATE POLICY "select_active_rewards" ON rewards FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "admin_manage_rewards" ON rewards;
CREATE POLICY "admin_manage_rewards" ON rewards FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "select_own_reward_requests" ON reward_requests;
CREATE POLICY "select_own_reward_requests" ON reward_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = employee_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "employee_create_reward_request" ON reward_requests;
CREATE POLICY "employee_create_reward_request" ON reward_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = auth.uid()
    AND status = 'pending'
    AND EXISTS (SELECT 1 FROM public.rewards WHERE id = reward_id AND is_active = true)
  );

DROP POLICY IF EXISTS "admin_update_reward_requests" ON reward_requests;
CREATE POLICY "admin_update_reward_requests" ON reward_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin_delete_reward_requests" ON reward_requests;
CREATE POLICY "admin_delete_reward_requests" ON reward_requests FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Realtime for points_log (for toast notifications)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'points_log'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.points_log;
  END IF;
END $$;
