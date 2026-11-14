-- Migration: Add submission_link and submission_note to tasks, and update mark_task_done
-- Date: 2026-11-14

-- 1. Add columns to tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS submission_link text,
  ADD COLUMN IF NOT EXISTS submission_note text;

-- 2. Add CHECK constraints
ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_submission_link_check,
  ADD CONSTRAINT tasks_submission_link_check
    CHECK (
      submission_link IS NULL OR (
        submission_link ~* '^https?://' AND length(submission_link) <= 2000
      )
    );

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_submission_note_check,
  ADD CONSTRAINT tasks_submission_note_check
    CHECK (
      submission_note IS NULL OR length(submission_note) <= 500
    );

-- 3. Drop existing single-argument function overload to prevent ambiguity
DROP FUNCTION IF EXISTS public.mark_task_done(uuid);

-- 4. Create updated mark_task_done function with optional link and note
CREATE OR REPLACE FUNCTION public.mark_task_done(
  p_task_id uuid,
  p_link text DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_link text;
  v_note text;
BEGIN
  -- Trim blanks to null
  v_link := NULLIF(btrim(p_link), '');
  v_note := NULLIF(btrim(p_note), '');

  -- Validate link if provided
  IF v_link IS NOT NULL THEN
    IF length(v_link) > 2000 THEN
      RAISE EXCEPTION 'Link must be at most 2000 characters';
    END IF;
    IF v_link !~* '^https?://' THEN
      RAISE EXCEPTION 'Link must start with http:// or https://';
    END IF;
  END IF;

  -- Validate note if provided
  IF v_note IS NOT NULL AND length(v_note) > 500 THEN
    RAISE EXCEPTION 'Note must be at most 500 characters';
  END IF;

  -- Update task: only assigned employee, status assigned or rejected -> done_pending
  UPDATE public.tasks
  SET status = 'done_pending',
      done_at = now(),
      submission_link = v_link,
      submission_note = v_note
  WHERE id = p_task_id
    AND assigned_to = auth.uid()
    AND status IN ('assigned', 'rejected');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This task cannot be marked done right now';
  END IF;
END;
$$;

-- 5. Revoke from public & anon, grant execute to authenticated
REVOKE EXECUTE ON FUNCTION public.mark_task_done(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_task_done(uuid, text, text) TO authenticated;
