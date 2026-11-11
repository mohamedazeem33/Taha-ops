/*
# Team accounts, roles and access rules

## Plain-English summary
Sets up the team member records for the dashboard. Every person who can sign in gets a profile (name, email, active status) and exactly one role: admin or employee. Roles live in their own table so a profile edit can never grant someone admin rights.

## 1. New tables
- `profiles`
  - `id` (uuid, primary key): same id as the person's sign-in account.
  - `full_name` (text): display name.
  - `email` (text): sign-in email, copied for display.
  - `is_active` (boolean, default true): false when an admin deactivates the employee.
  - `must_change_password` (boolean, default false): true for new employees until they replace their temporary password.
  - `created_at` (timestamptz): when the account was created.
- `user_roles`
  - `user_id` (uuid, primary key): the account this role belongs to.
  - `role` (text): either `admin` or `employee`.
  - `created_at` (timestamptz).

## 2. New functions
- `has_role(user_id, role)`: security definer check used by policies to test a role without exposing the roles table.
- `admin_setup_available()`: returns true only while no admin account exists, so the first-admin setup screen can be shown.
- `complete_password_change()`: clears the must-change-password flag for the signed-in user after they set their own password.

## 3. Security changes
- Row level security is enabled on both tables.
- Signed-in users can read their own profile and role. Admins can read every profile and role.
- Employees can update only their own full name. Admins can update the full name of any profile.
- Nobody can change roles, active status, or the must-change flag through direct table writes. Those changes happen in server functions that verify the caller is an admin.
- Client apps cannot insert or delete profiles or roles directly.

## 4. Important notes
1. Accounts are created only by server functions using the service role, never by a public sign-up form.
2. The first-admin setup is only available while no admin exists.
3. Idempotent: safe to re-run.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  must_change_password boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'employee')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_roles_role_idx ON user_roles (role);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

REVOKE EXECUTE ON FUNCTION has_role(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION has_role(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION admin_setup_available()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'admin'
  );
$$;

REVOKE EXECUTE ON FUNCTION admin_setup_available() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_setup_available() TO anon, authenticated;

CREATE OR REPLACE FUNCTION complete_password_change()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.profiles
  SET must_change_password = false
  WHERE id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION complete_password_change() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION complete_password_change() TO authenticated;

GRANT SELECT ON profiles TO authenticated;
GRANT UPDATE (full_name) ON profiles TO authenticated;
GRANT SELECT ON user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles, user_roles TO service_role;

DROP POLICY IF EXISTS "select_own_or_admin_profiles" ON profiles;
CREATE POLICY "select_own_or_admin_profiles" ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "update_own_profile_name" ON profiles;
CREATE POLICY "update_own_profile_name" ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "admin_update_profiles" ON profiles;
CREATE POLICY "admin_update_profiles" ON profiles FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "select_own_or_admin_roles" ON user_roles;
CREATE POLICY "select_own_or_admin_roles" ON user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
