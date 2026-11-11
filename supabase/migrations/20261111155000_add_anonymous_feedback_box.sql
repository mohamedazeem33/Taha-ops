/*
# Private Anonymous Feedback Box

## Plain-English summary
Adds a private, anonymous peer feedback system.
1. Teammates can send anonymous feedback to any active colleague (with optional tags and max 10 messages/day).
2. The sender's identity is strictly hidden and never exposed to the receiver in any query, view, or realtime feed.
3. Receivers access their inbox protected by a 4-digit PIN (hashed via pgcrypto on the server, with a 15-minute lockout after 5 failed attempts).
4. Receivers can report abusive messages to the admin; only then is the message and sender revealed to the admin in a dedicated Reports dashboard.
5. Admins can view aggregate weekly feedback counts, inspect/delete reported messages, and reset an employee's forgotten PIN.

## 1. New tables
- `feedback_pins`
  - `employee_id` (uuid, primary key): references profiles(id).
  - `pin_hash` (text): bcrypt hash of the 4-digit PIN. Never stored in plain text and never sent to client.
  - `failed_attempts` (integer): consecutive wrong attempts counter.
  - `locked_until` (timestamptz): expiration time if account is locked.
  - `updated_at` (timestamptz).
- `feedback_messages`
  - `id` (uuid, primary key).
  - `sender_id` (uuid): references profiles(id).
  - `receiver_id` (uuid): references profiles(id).
  - `tag` (text, nullable): optional categorization tag.
  - `message` (text): max 500 characters.
  - `created_at` (timestamptz).
  - `read_at` (timestamptz, nullable).
  - `is_reported` (boolean, default false).
  - `reported_at` (timestamptz, nullable).

## 2. Security & RLS
- RLS enabled on both tables.
- Direct SELECT on `feedback_pins` and `feedback_messages` is forbidden to client roles.
- All reads and writes occur via SECURITY DEFINER functions with search_path secured.
- `get_feedback_inbox_messages` explicitly excludes `sender_id` so receivers never receive sender details.
- Realtime publication is intentionally NOT attached to `feedback_messages` to prevent payload leakage.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create tables
CREATE TABLE IF NOT EXISTS public.feedback_pins (
  employee_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feedback_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tag text CHECK (tag IS NULL OR tag IN ('Late to meeting', 'Not focused', 'Great teamwork', 'Shoutout')),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  is_reported boolean NOT NULL DEFAULT false,
  reported_at timestamptz,
  CONSTRAINT feedback_message_length CHECK (char_length(btrim(message)) > 0 AND char_length(message) <= 500)
);

CREATE INDEX IF NOT EXISTS feedback_messages_receiver_idx ON public.feedback_messages (receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_messages_sender_date_idx ON public.feedback_messages (sender_id, created_at);
CREATE INDEX IF NOT EXISTS feedback_messages_reported_idx ON public.feedback_messages (is_reported, reported_at DESC);

-- 2. Row Level Security
ALTER TABLE public.feedback_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_messages ENABLE ROW LEVEL SECURITY;

-- Block direct SELECT/mutation on feedback_pins for all authenticated clients
DROP POLICY IF EXISTS "no_direct_access_feedback_pins" ON public.feedback_pins;
CREATE POLICY "no_direct_access_feedback_pins" ON public.feedback_pins
  FOR ALL TO authenticated USING (false);

-- Block direct SELECT on feedback_messages for authenticated clients (all reads via RPC)
DROP POLICY IF EXISTS "no_direct_select_feedback_messages" ON public.feedback_messages;
CREATE POLICY "no_direct_select_feedback_messages" ON public.feedback_messages
  FOR SELECT TO authenticated USING (false);

-- Allow admin direct DELETE on reported feedback messages only
DROP POLICY IF EXISTS "admin_delete_reported_feedback" ON public.feedback_messages;
CREATE POLICY "admin_delete_reported_feedback" ON public.feedback_messages
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') AND is_reported = true);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_pins TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_messages TO service_role;
GRANT DELETE ON public.feedback_messages TO authenticated;

-- 3. Stored Functions (SECURITY DEFINER)

-- Get active teammates for feedback recipient dropdown
CREATE OR REPLACE FUNCTION public.get_feedback_recipients()
RETURNS TABLE(id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT p.id, p.full_name
  FROM public.profiles p
  JOIN public.user_roles r ON r.user_id = p.id
  WHERE p.is_active = true
    AND r.role = 'employee'
    AND p.id != auth.uid()
  ORDER BY p.full_name ASC;
$$;

-- Check if current user has a PIN configured and its lock status
CREATE OR REPLACE FUNCTION public.get_feedback_pin_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_pin public.feedback_pins%ROWTYPE;
  v_now timestamptz := now();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_pin FROM public.feedback_pins WHERE employee_id = auth.uid();
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'has_pin', false,
      'is_locked', false,
      'remaining_seconds', 0
    );
  END IF;

  IF v_pin.locked_until IS NOT NULL AND v_pin.locked_until > v_now THEN
    RETURN jsonb_build_object(
      'has_pin', true,
      'is_locked', true,
      'locked_until', v_pin.locked_until,
      'remaining_seconds', GREATEST(0, EXTRACT(EPOCH FROM (v_pin.locked_until - v_now))::integer)
    );
  ELSE
    RETURN jsonb_build_object(
      'has_pin', true,
      'is_locked', false,
      'remaining_seconds', 0
    );
  END IF;
END;
$$;

-- Set first-time 4-digit PIN
CREATE OR REPLACE FUNCTION public.set_feedback_pin(p_pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_pin IS NULL OR p_pin !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'PIN must be exactly 4 digits';
  END IF;

  IF EXISTS (SELECT 1 FROM public.feedback_pins WHERE employee_id = auth.uid()) THEN
    RAISE EXCEPTION 'PIN is already configured. Use Change PIN instead.';
  END IF;

  INSERT INTO public.feedback_pins (employee_id, pin_hash, failed_attempts, locked_until, updated_at)
  VALUES (auth.uid(), extensions.crypt(p_pin, extensions.gen_salt('bf')), 0, NULL, now());
END;
$$;

-- Verify PIN and handle 5-attempt / 15-minute lockout
CREATE OR REPLACE FUNCTION public.verify_feedback_pin(p_pin text)
RETURNS jsonb
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
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_pin FROM public.feedback_pins WHERE employee_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No PIN configured yet';
  END IF;

  -- Check if already locked
  IF v_pin.locked_until IS NOT NULL AND v_pin.locked_until > v_now THEN
    RETURN jsonb_build_object(
      'success', false,
      'is_locked', true,
      'locked_until', v_pin.locked_until,
      'remaining_seconds', GREATEST(0, EXTRACT(EPOCH FROM (v_pin.locked_until - v_now))::integer),
      'attempts_left', 0
    );
  END IF;

  -- Check match
  IF v_pin.pin_hash = extensions.crypt(p_pin, v_pin.pin_hash) THEN
    UPDATE public.feedback_pins
    SET failed_attempts = 0, locked_until = NULL, updated_at = v_now
    WHERE employee_id = auth.uid();

    RETURN jsonb_build_object(
      'success', true,
      'is_locked', false,
      'remaining_seconds', 0,
      'attempts_left', 5
    );
  ELSE
    v_new_attempts := v_pin.failed_attempts + 1;
    IF v_new_attempts >= 5 THEN
      v_lock_time := v_now + interval '15 minutes';
      UPDATE public.feedback_pins
      SET failed_attempts = 0, locked_until = v_lock_time, updated_at = v_now
      WHERE employee_id = auth.uid();

      RETURN jsonb_build_object(
        'success', false,
        'is_locked', true,
        'locked_until', v_lock_time,
        'remaining_seconds', 900,
        'attempts_left', 0
      );
    ELSE
      UPDATE public.feedback_pins
      SET failed_attempts = v_new_attempts, updated_at = v_now
      WHERE employee_id = auth.uid();

      RETURN jsonb_build_object(
        'success', false,
        'is_locked', false,
        'remaining_seconds', 0,
        'attempts_left', 5 - v_new_attempts
      );
    END IF;
  END IF;
END;
$$;

-- Change PIN (requires correct current PIN)
CREATE OR REPLACE FUNCTION public.change_feedback_pin(p_old_pin text, p_new_pin text)
RETURNS jsonb
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
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_new_pin IS NULL OR p_new_pin !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'New PIN must be exactly 4 digits';
  END IF;

  SELECT * INTO v_pin FROM public.feedback_pins WHERE employee_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No PIN configured yet';
  END IF;

  IF v_pin.locked_until IS NOT NULL AND v_pin.locked_until > v_now THEN
    RETURN jsonb_build_object(
      'success', false,
      'is_locked', true,
      'locked_until', v_pin.locked_until,
      'remaining_seconds', GREATEST(0, EXTRACT(EPOCH FROM (v_pin.locked_until - v_now))::integer),
      'error', 'Feedback box is locked. Please wait.'
    );
  END IF;

  IF v_pin.pin_hash = extensions.crypt(p_old_pin, v_pin.pin_hash) THEN
    UPDATE public.feedback_pins
    SET pin_hash = extensions.crypt(p_new_pin, extensions.gen_salt('bf')),
        failed_attempts = 0,
        locked_until = NULL,
        updated_at = v_now
    WHERE employee_id = auth.uid();

    RETURN jsonb_build_object('success', true);
  ELSE
    v_new_attempts := v_pin.failed_attempts + 1;
    IF v_new_attempts >= 5 THEN
      v_lock_time := v_now + interval '15 minutes';
      UPDATE public.feedback_pins
      SET failed_attempts = 0, locked_until = v_lock_time, updated_at = v_now
      WHERE employee_id = auth.uid();

      RETURN jsonb_build_object(
        'success', false,
        'is_locked', true,
        'locked_until', v_lock_time,
        'remaining_seconds', 900,
        'error', 'Too many failed attempts. Feedback box locked for 15 minutes.'
      );
    ELSE
      UPDATE public.feedback_pins
      SET failed_attempts = v_new_attempts, updated_at = v_now
      WHERE employee_id = auth.uid();

      RETURN jsonb_build_object(
        'success', false,
        'is_locked', false,
        'attempts_left', 5 - v_new_attempts,
        'error', 'Current PIN is incorrect'
      );
    END IF;
  END IF;
END;
$$;

-- Admin resets employee PIN (employee sets a fresh one upon opening feedback)
CREATE OR REPLACE FUNCTION public.admin_reset_feedback_pin(p_employee_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can reset employee feedback PINs';
  END IF;

  DELETE FROM public.feedback_pins WHERE employee_id = p_employee_id;
END;
$$;

-- Send anonymous peer feedback (max 10 per day per sender in IST)
CREATE OR REPLACE FUNCTION public.send_feedback_message(
  p_receiver_id uuid,
  p_tag text,
  p_message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_sender_id uuid := auth.uid();
  v_today_count integer;
  v_clean_msg text;
  v_clean_tag text;
BEGIN
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_receiver_id IS NULL OR p_receiver_id = v_sender_id THEN
    RAISE EXCEPTION 'Invalid recipient';
  END IF;

  -- Ensure recipient is an active employee
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_roles r ON r.user_id = p.id
    WHERE p.id = p_receiver_id AND p.is_active = true AND r.role = 'employee'
  ) THEN
    RAISE EXCEPTION 'Recipient is not an active teammate';
  END IF;

  v_clean_msg := btrim(COALESCE(p_message, ''));
  IF char_length(v_clean_msg) = 0 THEN
    RAISE EXCEPTION 'Message cannot be empty';
  END IF;
  IF char_length(v_clean_msg) > 500 THEN
    RAISE EXCEPTION 'Message cannot exceed 500 characters';
  END IF;

  v_clean_tag := btrim(COALESCE(p_tag, ''));
  IF v_clean_tag = '' THEN
    v_clean_tag := NULL;
  ELSIF v_clean_tag NOT IN ('Late to meeting', 'Not focused', 'Great teamwork', 'Shoutout') THEN
    RAISE EXCEPTION 'Invalid tag selected';
  END IF;

  -- Rate limit: max 10 per day per sender in IST
  SELECT count(*) INTO v_today_count
  FROM public.feedback_messages
  WHERE sender_id = v_sender_id
    AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = (now() AT TIME ZONE 'Asia/Kolkata')::date;

  IF v_today_count >= 10 THEN
    RAISE EXCEPTION 'Daily feedback limit reached (maximum 10 messages per day)';
  END IF;

  INSERT INTO public.feedback_messages (sender_id, receiver_id, tag, message)
  VALUES (v_sender_id, p_receiver_id, v_clean_tag, v_clean_msg);
END;
$$;

-- Fetch inbox messages: verifies PIN, returns columns strictly EXCLUDING sender_id
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_pin FROM public.feedback_pins WHERE employee_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PIN not configured';
  END IF;

  IF v_pin.locked_until IS NOT NULL AND v_pin.locked_until > v_now THEN
    RAISE EXCEPTION 'Feedback box is locked';
  END IF;

  IF v_pin.pin_hash != extensions.crypt(p_pin, v_pin.pin_hash) THEN
    RAISE EXCEPTION 'Invalid PIN';
  END IF;

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
END;
$$;

-- Mark message as read
CREATE OR REPLACE FUNCTION public.mark_feedback_message_read(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE public.feedback_messages
  SET read_at = COALESCE(read_at, now())
  WHERE id = p_message_id AND receiver_id = auth.uid();
END;
$$;

-- Report message to admin (reveals sender identity to admin only)
CREATE OR REPLACE FUNCTION public.report_feedback_message(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE public.feedback_messages
  SET is_reported = true,
      reported_at = COALESCE(reported_at, now())
  WHERE id = p_message_id AND receiver_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found or unauthorized';
  END IF;
END;
$$;

-- Admin: Fetch reported messages with sender and receiver identities
CREATE OR REPLACE FUNCTION public.get_reported_feedback_messages()
RETURNS TABLE(
  id uuid,
  sender_id uuid,
  sender_name text,
  receiver_id uuid,
  receiver_name text,
  tag text,
  message text,
  created_at timestamptz,
  reported_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can view reported feedback';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.sender_id,
    sender.full_name AS sender_name,
    m.receiver_id,
    receiver.full_name AS receiver_name,
    m.tag,
    m.message,
    m.created_at,
    m.reported_at
  FROM public.feedback_messages m
  JOIN public.profiles sender ON sender.id = m.sender_id
  JOIN public.profiles receiver ON receiver.id = m.receiver_id
  WHERE m.is_reported = true
  ORDER BY m.reported_at DESC;
END;
$$;

-- Admin: Delete a reported message
CREATE OR REPLACE FUNCTION public.delete_reported_feedback_message(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete reported feedback';
  END IF;

  DELETE FROM public.feedback_messages
  WHERE id = p_message_id AND is_reported = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reported message not found';
  END IF;
END;
$$;

-- Admin: Aggregate feedback stats (admin cannot see non-reported messages)
CREATE OR REPLACE FUNCTION public.get_admin_feedback_stats()
RETURNS TABLE(
  total_sent_this_week bigint,
  total_reported bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_week_start timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can view feedback stats';
  END IF;

  v_week_start := date_trunc('week', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata';

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM public.feedback_messages WHERE created_at >= v_week_start)::bigint AS total_sent_this_week,
    (SELECT count(*) FROM public.feedback_messages WHERE is_reported = true)::bigint AS total_reported;
END;
$$;

-- 4. Revoke public/anon access and grant to authenticated
REVOKE EXECUTE ON FUNCTION public.get_feedback_recipients() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_feedback_recipients() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_feedback_pin_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_feedback_pin_status() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.set_feedback_pin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_feedback_pin(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.verify_feedback_pin(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_feedback_pin(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.change_feedback_pin(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.change_feedback_pin(text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_reset_feedback_pin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_feedback_pin(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.send_feedback_message(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_feedback_message(uuid, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_feedback_inbox_messages(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_feedback_inbox_messages(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.mark_feedback_message_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_feedback_message_read(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.report_feedback_message(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_feedback_message(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_reported_feedback_messages() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_reported_feedback_messages() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.delete_reported_feedback_message(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_reported_feedback_message(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_admin_feedback_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_feedback_stats() TO authenticated;

