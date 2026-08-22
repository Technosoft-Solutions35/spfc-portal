-- ============================================================
-- DLC Admin Dashboard: audit_log, integrations, system_images
-- ============================================================

-- ── Tabla de auditoría ──
CREATE TABLE IF NOT EXISTS audit_log (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  username   text,
  action     text NOT NULL,
  entity     text,
  entity_id  text,
  details    jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_admin_all" ON audit_log
  FOR ALL USING (public.has_permission('admin'));

CREATE POLICY "audit_superadmin_all" ON audit_log
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'super-admin');

-- Function: log_admin_action
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action text,
  p_entity text DEFAULT NULL,
  p_entity_id text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid uuid;
  v_username text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NOT NULL THEN
    SELECT username INTO v_username FROM profiles WHERE id = v_uid;
  END IF;
  INSERT INTO audit_log (user_id, username, action, entity, entity_id, details)
  VALUES (v_uid, v_username, p_action, p_entity, p_entity_id, p_details);
END;
$$;

-- Function: cleanup_old_audit_logs
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs(p_days integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM audit_log WHERE created_at < now() - (p_days || ' days')::interval;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at DESC);

-- ── Tabla de integraciones ──
CREATE TABLE IF NOT EXISTS integrations (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text UNIQUE NOT NULL,
  label       text NOT NULL,
  icon        text,
  active      boolean DEFAULT true,
  settings    jsonb DEFAULT '{}',
  updated_at  timestamptz DEFAULT now(),
  updated_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integrations_select" ON integrations
  FOR SELECT USING (true);

CREATE POLICY "integrations_superadmin" ON integrations
  FOR ALL USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'super-admin');

-- Insertar integraciones por defecto (upsert para no duplicar)
INSERT INTO integrations (name, label, icon, active, settings) VALUES
  ('pokeapi', 'PokeAPI', 'Database', true, '{"base_url":"https://pokeapi.co/api/v2","cache_minutes":60}'),
  ('discord_webhook', 'Discord Webhook', 'MessageSquare', false, '{"url":""}'),
  ('supabase_storage', 'Supabase Storage', 'HardDrive', true, '{"bucket":"images","max_mb":5}'),
  ('edge_functions', 'Edge Functions', 'Server', true, '{"timeout_seconds":30}')
ON CONFLICT (name) DO NOTHING;
