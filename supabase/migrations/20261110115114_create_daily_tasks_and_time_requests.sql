/*
# Daily tasks, time requests and end-of-day rules

## Plain-English summary
Adds the daily task list. Admins assign tasks to employees for a given day (IST). Employees mark tasks done, the admin confirms or rejects them, and employees can ask for more time. The admin can close the day, which marks unfinished tasks as missed, and roll them over to the next day.

## 1. New tables
- `tasks`
  - `id`, `assigned_to` (employee), `assigned_by` (admin), `task_date` (IST calendar day).
  - `client_name`, `title`, `description`, `deadline` (timestamptz, shown in IST).
  - `status`: assigned, done_pending, completed, rejected, missed.
  - `done_at`, `confirmed_at`, `rolled_over_from` (the earlier task this one was copied from).
  - `rejection_reason`: the admin's reason when a task is rejected.
  - `created_at`.
- `time_requests`
  - `id`, `task_id`, `employee_id`, `reason`, `requested_deadline`, `status` (pending, approved, rejected), `created_at`.
  - At most one pending request per task.

## 2. Server functions (all check the caller)
- `mark_task_done(task_id)`: employee marks their own assigned or rejected task as done (moves to done_pending).
- `review_task(task_id, decision, reason)`: admin confirms (completed) or rejects (back to rejected, with a required reason). Only tasks waiting for confirmation can be reviewed.
- `review_time_request(request_id, decision, new_deadline)`: admin approves (moves the task deadline to the new time) or rejects a pending request.
- `close_day(day)`: admin marks the day's assigned and rejected tasks as missed. Returns the count.
- `roll_over_tasks(day)`: admin copies that day's missed tasks into the next day, one copy per task. Safe to run twice.

## 3. Security changes
- Row level security on both tables.
- Employees can read only their own tasks and their own time requests.
- Employees can create a time request only for their own open task. They cannot change any task directly.
- Admins can read all tasks and create, edit (client, title, description, deadline) and delete tasks.
- Status changes happen only through the server functions above.
- Realtime is enabled for both tables so employees see new tasks live. Access is still filtered by the rules above.

## 4. Important notes
1. Times are stored as exact moments. Day boundaries use Asia/Kolkata.
2. Nothing is dropped or rewritten in existing tables; this migration only adds.
3. Idempotent: safe to re-run.
*/

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_to uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  task_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Kolkata')::date),
  client_name text NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  deadline timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'done_pending', 'completed', 'rejected', 'missed')),
  done_at timestamptz,
  confirmed_at timestamptz,
  rejection_reason text,
  rolled_over_from uuid REFERENCES tasks(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS time_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  requested_deadline timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_assignee_date_idx ON tasks (assigned_to, task_date);
CREATE INDEX IF NOT EXISTS tasks_date_idx ON tasks (task_date);
CREATE INDEX IF NOT EXISTS time_requests_task_idx ON time_requests (task_id);
CREATE UNIQUE INDEX IF NOT EXISTS time_requests_one_pending_idx ON time_requests (task_id) WHERE status = 'pending';

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION mark_task_done(p_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.tasks
  SET status = 'done_pending', done_at = now()
  WHERE id = p_task_id
    AND assigned_to = auth.uid()
    AND status IN ('assigned', 'rejected');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This task cannot be marked done right now';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION review_task(p_task_id uuid, p_decision text, p_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
    AND status = 'done_pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This task is no longer waiting for confirmation';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION review_time_request(
  p_request_id uuid,
  p_decision text,
  p_new_deadline timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r public.time_requests%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can review time requests';
  END IF;

  IF p_decision NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Unknown decision';
  END IF;

  SELECT * INTO r
  FROM public.time_requests
  WHERE id = p_request_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This request is no longer pending';
  END IF;

  IF p_decision = 'approve' THEN
    IF p_new_deadline IS NULL THEN
      RAISE EXCEPTION 'A new deadline is required to approve a request';
    END IF;
    UPDATE public.tasks SET deadline = p_new_deadline WHERE id = r.task_id;
    UPDATE public.time_requests SET status = 'approved' WHERE id = r.id;
  ELSE
    UPDATE public.time_requests SET status = 'rejected' WHERE id = r.id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION close_day(p_day date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can close the day';
  END IF;

  WITH updated AS (
    UPDATE public.tasks
    SET status = 'missed'
    WHERE task_date = p_day
      AND status IN ('assigned', 'rejected')
    RETURNING id
  )
  SELECT count(*)::integer INTO v_count FROM updated;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION roll_over_tasks(p_day date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can roll over tasks';
  END IF;

  WITH inserted AS (
    INSERT INTO public.tasks (
      assigned_to, assigned_by, task_date, client_name, title, description, deadline, rolled_over_from
    )
    SELECT t.assigned_to, auth.uid(), p_day + 1, t.client_name, t.title, t.description,
           t.deadline + interval '1 day', t.id
    FROM public.tasks t
    WHERE t.task_date = p_day
      AND t.status = 'missed'
      AND NOT EXISTS (SELECT 1 FROM public.tasks n WHERE n.rolled_over_from = t.id)
    RETURNING id
  )
  SELECT count(*)::integer INTO v_count FROM inserted;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION mark_task_done(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION review_task(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION review_time_request(uuid, text, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION close_day(date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION roll_over_tasks(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION mark_task_done(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION review_task(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION review_time_request(uuid, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION close_day(date) TO authenticated;
GRANT EXECUTE ON FUNCTION roll_over_tasks(date) TO authenticated;

GRANT SELECT ON tasks TO authenticated;
GRANT INSERT (assigned_to, assigned_by, task_date, client_name, title, description, deadline) ON tasks TO authenticated;
GRANT UPDATE (client_name, title, description, deadline) ON tasks TO authenticated;
GRANT DELETE ON tasks TO authenticated;

GRANT SELECT ON time_requests TO authenticated;
GRANT INSERT (task_id, employee_id, reason, requested_deadline) ON time_requests TO authenticated;

DROP POLICY IF EXISTS "select_own_or_admin_tasks" ON tasks;
CREATE POLICY "select_own_or_admin_tasks" ON tasks FOR SELECT
  TO authenticated
  USING (auth.uid() = assigned_to OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin_insert_tasks" ON tasks;
CREATE POLICY "admin_insert_tasks" ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND assigned_by = auth.uid());

DROP POLICY IF EXISTS "admin_update_tasks" ON tasks;
CREATE POLICY "admin_update_tasks" ON tasks FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admin_delete_tasks" ON tasks;
CREATE POLICY "admin_delete_tasks" ON tasks FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "select_own_or_admin_time_requests" ON time_requests;
CREATE POLICY "select_own_or_admin_time_requests" ON time_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = employee_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "employee_insert_own_time_requests" ON time_requests;
CREATE POLICY "employee_insert_own_time_requests" ON time_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id = auth.uid()
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id
        AND t.assigned_to = auth.uid()
        AND t.status IN ('assigned', 'rejected')
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'time_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.time_requests;
  END IF;
END $$;
