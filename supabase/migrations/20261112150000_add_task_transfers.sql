-- Migration: Add task transfer functionality and audit table

-- 1. Create task_transfers audit table
CREATE TABLE IF NOT EXISTS public.task_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  from_employee uuid NOT NULL REFERENCES public.profiles(id),
  to_employee uuid NOT NULL REFERENCES public.profiles(id),
  transferred_by uuid NOT NULL REFERENCES public.profiles(id),
  transferred_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on task_transfers
ALTER TABLE public.task_transfers ENABLE ROW LEVEL SECURITY;

-- Admins only can read task_transfers
DROP POLICY IF EXISTS "admin_select_task_transfers" ON public.task_transfers;
CREATE POLICY "admin_select_task_transfers" ON public.task_transfers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Grant select to authenticated (guarded by RLS policy)
GRANT SELECT ON public.task_transfers TO authenticated;

-- 2. transfer_task stored procedure
CREATE OR REPLACE FUNCTION public.transfer_task(
  p_task_id uuid,
  p_new_employee uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_task public.tasks%ROWTYPE;
BEGIN
  -- Admin only
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can transfer tasks';
  END IF;

  -- Lock and read task row so concurrent changes cannot slip through
  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- Only allowed for assigned or rejected
  IF v_task.status NOT IN ('assigned', 'rejected') THEN
    RAISE EXCEPTION 'Only tasks that are assigned or rejected can be transferred';
  END IF;

  -- Cannot transfer to the current assignee
  IF v_task.assigned_to = p_new_employee THEN
    RAISE EXCEPTION 'Task is already assigned to this employee';
  END IF;

  -- Recipient must be an active employee
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles r ON r.user_id = p.id
    WHERE p.id = p_new_employee
      AND p.is_active = true
      AND r.role = 'employee'
  ) THEN
    RAISE EXCEPTION 'Recipient must be an active employee';
  END IF;

  -- Update task assignee (keeps task_date, deadline, title, description, status)
  UPDATE public.tasks
  SET assigned_to = p_new_employee
  WHERE id = p_task_id;

  -- Reject any pending time requests on this task automatically
  -- Note: time_requests does not have reviewed_at column, only status
  UPDATE public.time_requests
  SET status = 'rejected'
  WHERE task_id = p_task_id
    AND status = 'pending';

  -- Record in audit table
  INSERT INTO public.task_transfers (
    task_id,
    from_employee,
    to_employee,
    transferred_by,
    transferred_at
  ) VALUES (
    p_task_id,
    v_task.assigned_to,
    p_new_employee,
    auth.uid(),
    now()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.transfer_task(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transfer_task(uuid, uuid) TO authenticated;

