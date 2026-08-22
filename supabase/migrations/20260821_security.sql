-- ============================================================
-- DLC Security: bans, account nuke, deletion password
-- ============================================================

-- ── Tabla de baneos ──
CREATE TABLE IF NOT EXISTS user_bans (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ban_type    text NOT NULL CHECK (ban_type IN ('temp', 'perm')),
  reason      text,
  banned_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  banned_at   timestamptz DEFAULT now(),
  expires_at  timestamptz,
  active      boolean DEFAULT true
);

ALTER TABLE user_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bans_select" ON user_bans FOR SELECT USING (true);
CREATE POLICY "bans_superadmin" ON user_bans FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'super-admin');

CREATE INDEX IF NOT EXISTS idx_user_bans_user_id ON user_bans (user_id);
CREATE INDEX IF NOT EXISTS idx_user_bans_active ON user_bans (active);

-- ── Check if user is banned ──
CREATE OR REPLACE FUNCTION public.is_user_banned(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ban record;
BEGIN
  SELECT * INTO v_ban
  FROM user_bans
  WHERE user_id = p_user_id AND active = true
    AND (ban_type = 'perm' OR expires_at > now())
  ORDER BY banned_at DESC LIMIT 1;

  IF v_ban IS NULL THEN
    RETURN jsonb_build_object('banned', false);
  END IF;

  RETURN jsonb_build_object(
    'banned', true,
    'ban_type', v_ban.ban_type,
    'reason', v_ban.reason,
    'banned_at', v_ban.banned_at,
    'expires_at', v_ban.expires_at
  );
END;
$$;

-- ── Ban a user ──
CREATE OR REPLACE FUNCTION public.ban_user(
  p_user_id uuid,
  p_ban_type text,
  p_reason text DEFAULT NULL,
  p_duration_hours integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ban_id uuid;
  v_expires_at timestamptz;
BEGIN
  IF p_ban_type NOT IN ('temp', 'perm') THEN
    RETURN jsonb_build_object('error', 'ban_type must be temp or perm');
  END IF;

  -- Deactivate any existing active bans for this user
  UPDATE user_bans SET active = false WHERE user_id = p_user_id AND active = true;

  IF p_ban_type = 'temp' AND p_duration_hours IS NOT NULL THEN
    v_expires_at := now() + (p_duration_hours || ' hours')::interval;
  END IF;

  INSERT INTO user_bans (user_id, ban_type, reason, banned_by, expires_at)
  VALUES (p_user_id, p_ban_type, p_reason, auth.uid(), v_expires_at)
  RETURNING id INTO v_ban_id;

  RETURN jsonb_build_object('ok', true, 'ban_id', v_ban_id, 'expires_at', v_expires_at);
END;
$$;

-- ── Unban a user ──
CREATE OR REPLACE FUNCTION public.unban_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE user_bans SET active = false WHERE user_id = p_user_id AND active = true;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ── Nuke: deactivate all accounts except super-admin ──
CREATE OR REPLACE FUNCTION public.nuke_all_accounts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE profiles SET role = 'disabled' WHERE role != 'super-admin';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  PERFORM public.log_admin_action('accounts_nuked', 'profiles', NULL, jsonb_build_object('affected', v_count));
  RETURN v_count;
END;
$$;

-- ── Reactivate all nuked accounts ──
CREATE OR REPLACE FUNCTION public.reactivate_all_accounts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE profiles SET role = 'member' WHERE role = 'disabled';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  PERFORM public.log_admin_action('accounts_reactivated', 'profiles', NULL, jsonb_build_object('affected', v_count));
  RETURN v_count;
END;
$$;

-- ── Verify deletion password ──
CREATE OR REPLACE FUNCTION public.verify_deletion_password(p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stored text;
BEGIN
  SELECT value INTO v_stored FROM site_settings WHERE key = 'deletion_password';
  IF v_stored IS NULL THEN
    RETURN false;
  END IF;
  RETURN v_stored = p_password;
END;
$$;

-- ── Get active bans count ──
CREATE OR REPLACE FUNCTION public.get_active_bans()
RETURNS SETOF jsonb
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'id', b.id,
    'user_id', b.user_id,
    'username', p.username,
    'ban_type', b.ban_type,
    'reason', b.reason,
    'banned_at', b.banned_at,
    'expires_at', b.expires_at,
    'active', b.active
  )
  FROM user_bans b
  LEFT JOIN profiles p ON p.id = b.user_id
  WHERE b.active = true
  ORDER BY b.banned_at DESC;
$$;
