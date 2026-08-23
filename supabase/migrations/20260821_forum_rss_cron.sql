-- ============================================================
-- Forum RSS Cron: chequeo automático cada 30 minutos
-- ============================================================
-- IMPORTANTE: Antes de ejecutar, reemplazá YOUR_ANON_KEY con la
-- anon key real de tu proyecto Supabase.
-- La service role key se maneja internamente en la Edge Function.
-- ============================================================

-- 1. Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Tabla para trackear el estado del RSS (ya existe via site_settings)
-- No necesitamos tabla nueva, usamos site_settings.

-- 3. Función SQL que llama a la Edge Function via pg_net
CREATE OR REPLACE FUNCTION public.check_forum_rss_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://aoauwmffhmiwtokrrjhx.supabase.co/functions/v1/check-forum-rss',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'YOUR_ANON_KEY',
      'Authorization', 'Bearer ' || 'YOUR_ANON_KEY'
    ),
    body := '{}'::jsonb
  );
END;
$$;

-- 4. Programar el cron job: cada 30 minutos
SELECT cron.schedule(
  'check-forum-rss',
  '*/30 * * * *',
  'SELECT public.check_forum_rss_cron()'
);

-- 5. Verificar que el cron está registrado
-- SELECT * FROM cron.job WHERE jobname = 'check-forum-rss';
