-- ============================================================
-- Migración: Unificar events + tournaments en una sola tabla
-- ============================================================

-- 1. Agregar nuevas columnas a events
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'PvP';
ALTER TABLE events ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'OU';
ALTER TABLE events ADD COLUMN IF NOT EXISTS prize_count integer NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS prizes jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE events ADD COLUMN IF NOT EXISTS moderator text NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';
ALTER TABLE events ADD COLUMN IF NOT EXISTS rules text NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE events ADD COLUMN IF NOT EXISTS bracket_ready boolean NOT NULL DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS champion_name text NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS second_name text NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN IF NOT EXISTS third_name text NOT NULL DEFAULT '';

-- 2. Migrar datos de tournaments → events
INSERT INTO events (id, title, description, date, image_url, author_id, created_at, updated_at,
                    event_type, tier, prize_count, prizes, moderator, status, rules,
                    bracket_ready, champion_name, second_name, third_name)
SELECT id, title, description, start_date, image_url, author_id, created_at, updated_at,
       'PvP', tier, 0, '[]'::jsonb, '', status, rules,
       bracket_ready, champion_name, second_name, third_name
FROM tournaments;

-- 3. Drop FK constraints que referencian tournaments
ALTER TABLE bracket_matches DROP CONSTRAINT IF EXISTS bracket_matches_tournament_id_fkey;
ALTER TABLE tournament_rsvps DROP CONSTRAINT IF EXISTS tournament_rsvps_tournament_id_fkey;

-- 4. Agregar nuevas FK constraints que referencian events
ALTER TABLE bracket_matches ADD CONSTRAINT bracket_matches_tournament_id_fkey
  FOREIGN KEY (tournament_id) REFERENCES events(id) ON DELETE CASCADE;
ALTER TABLE tournament_rsvps ADD CONSTRAINT tournament_rsvps_tournament_id_fkey
  FOREIGN KEY (tournament_id) REFERENCES events(id) ON DELETE CASCADE;

-- 5. Eliminar tablas obsoletas
DROP TABLE IF EXISTS tournaments CASCADE;

-- 6. Comentarios para documentación
COMMENT ON COLUMN events.event_type IS 'PvP o PvE/Mixtos';
COMMENT ON COLUMN events.tier IS 'Formato: OU/UU/NU/VGC/Monotype/UT/Regional/Little Cup/Metronomo (PvP) o ShinyHunt/Fulminantes/Carreras/Cacería/Escondidas/Otro (PvE)';
COMMENT ON COLUMN events.prize_count IS 'Cantidad de posiciones con premio';
COMMENT ON COLUMN events.prizes IS 'JSON array: [{position: 1, prize: "描述"}, ...]';
COMMENT ON COLUMN events.images IS 'JSON array de URLs de imágenes del evento';
COMMENT ON COLUMN events.moderator IS 'Nombre del moderador del evento';
