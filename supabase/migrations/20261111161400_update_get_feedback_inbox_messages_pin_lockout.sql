/*
# Update get_feedback_inbox_messages to track PIN lockout

## Changes
- Updates `get_feedback_inbox_messages(p_pin text)` so that wrong PIN attempts count toward the lockout.
- Because `RAISE EXCEPTION` rolls back all mutations in that transaction, on a wrong PIN the function updates `failed_attempts` (and sets `locked_until` to 15 minutes at 5 failed attempts) and returns an empty result set instead of raising an error.
- On a correct PIN, `failed_attempts` is reset to 0 and `locked_until` is cleared.
- `sender_id` remains completely excluded from the returned columns and queries.
*/

CREATE OR REPLACE FUNCTION public.get_feedback_inbox_messages(p_pin text)
RETURNS TABLE(
  id uuid,
  receiver_id uuid,
  tag text,
  message text,
  created_at timestamptz,
  read_at timestamptz,
  is_reported boolean,
  reported_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_pin public.feedback_pins%ROWTYPE;
  v_now timestamptz := now();
  v_new_attempts integer;
  v_lock_time timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT * INTO v_pin FROM public.feedback_pins WHERE employee_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- If currently locked, return empty result
  IF v_pin.locked_until IS NOT NULL AND v_pin.locked_until > v_now THEN
    RETURN;
  END IF;

  -- Validate PIN
  IF v_pin.pin_hash = extensions.crypt(p_pin, v_pin.pin_hash) THEN
    -- Correct PIN: reset failed attempts counter & clear lock
    UPDATE public.feedback_pins
    SET failed_attempts = 0,
        locked_until = NULL,
        updated_at = v_now
    WHERE employee_id = auth.uid();

    -- Return messages strictly without sender_id
    RETURN QUERY
    SELECT
      m.id,
      m.receiver_id,
      m.tag,
      m.message,
      m.created_at,
      m.read_at,
      m.is_reported,
      m.reported_at
    FROM public.feedback_messages m
    WHERE m.receiver_id = auth.uid()
    ORDER BY m.created_at DESC;
  ELSE
    -- Incorrect PIN: increment failed attempts counter
    v_new_attempts := v_pin.failed_attempts + 1;
    IF v_new_attempts >= 5 THEN
      v_lock_time := v_now + interval '15 minutes';
      UPDATE public.feedback_pins
      SET failed_attempts = 0,
          locked_until = v_lock_time,
          updated_at = v_now
      WHERE employee_id = auth.uid();
    ELSE
      UPDATE public.feedback_pins
      SET failed_attempts = v_new_attempts,
          updated_at = v_now
      WHERE employee_id = auth.uid();
    END IF;

    -- Return empty result set (prevents transaction rollback so failed_attempts update commits)
    RETURN;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_feedback_inbox_messages(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_feedback_inbox_messages(text) TO authenticated;

