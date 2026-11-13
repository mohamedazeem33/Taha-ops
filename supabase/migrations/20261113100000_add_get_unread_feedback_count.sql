/*
# Add get_unread_feedback_count function

## Purpose
Returns the number of unread feedback messages for the authenticated user without exposing sender or message contents.

## Changes
- Creates SECURITY DEFINER function `public.get_unread_feedback_count()` returning `integer`
- Checks `auth.uid() IS NOT NULL` (raises exception if null)
- Counts rows in `public.feedback_messages` where `receiver_id = auth.uid()` AND `read_at IS NULL`
- `SET search_path = ''` and fully qualifies all references
- Revokes execute from `PUBLIC` and `anon`, grants to `authenticated`
*/

CREATE OR REPLACE FUNCTION public.get_unread_feedback_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_count integer;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT count(*)::integer
  INTO v_count
  FROM public.feedback_messages
  WHERE receiver_id = v_user_id
    AND read_at IS NULL;

  RETURN COALESCE(v_count, 0);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_unread_feedback_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_unread_feedback_count() TO authenticated;

