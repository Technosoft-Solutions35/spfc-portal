-- ═══════════════════════════════════════════════════════════════════════════
-- DLC 17: Raids (guías de incursiones legendarias)
-- Ejecuta en: Supabase Dashboard → SQL Editor → New query
-- (idempotente)
--
-- Sección pública "Raids" dentro del portal: igual que Guías y Buildeos,
-- pero con su propia tabla para poder gestionarlas por separado.
--   title/      → encabezado de la tarjeta
--   content/    → guía completa con la secuencia de turnos y los equipos
--   categories/ → Raids Legendarias | Raids Estacionarias/Evento ...
--   tags/       → etiquetas libres
--   image_url/  → portada (opcional; se muestra placeholder si no hay)
--   video_url/  → video de referencia en YouTube (opcional)
--   documents/  → documentos adjuntos (PDF, etc.) - opcional
-- RLS: lectura para todo miembro autenticado; escritura solo con permiso
-- "content" (misma matriz de permisos que guides y mods).
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Comentarios y me gusta: permitir 'raid' (igual que hicieron builds/trade)
alter table public.comments drop constraint if exists comments_parent_type_check;
alter table public.comments
  add constraint comments_parent_type_check
  check (parent_type in ('tournament', 'event', 'news', 'guide', 'raffle', 'build', 'trade', 'raid'));

alter table public.likes drop constraint if exists likes_parent_type_check;
alter table public.likes
  add constraint likes_parent_type_check
  check (parent_type in ('news', 'guide', 'event', 'tournament', 'raffle', 'build', 'trade', 'raid'));

-- 2) Tabla de raids
create table if not exists public.raids (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  excerpt    text not null default '',
  content    text not null default '',
  categories text[] not null default '{}',
  tags       text[] not null default '{}',
  image_url  text,
  video_url  text,
  documents  jsonb not null default '[]'::jsonb,
  author_id  uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.raids is
  'Raids: guías de incursiones legendarias del clan (estrategia, turnos y equipos).';

create index if not exists idx_raids_created on public.raids (created_at desc);

drop trigger if exists trg_raids_updated_at on public.raids;
create trigger trg_raids_updated_at
  before update on public.raids
  for each row execute function public.set_updated_at();

alter table public.raids enable row level security;

-- Lectura: cualquier miembro autenticado
drop policy if exists "raids_select_auth" on public.raids;
create policy "raids_select_auth"
  on public.raids for select
  using (auth.role() = 'authenticated');

-- Escritura: staff con permiso "content"
drop policy if exists "raids_insert_auth" on public.raids;
create policy "raids_insert_auth"
  on public.raids for insert
  with check (public.has_permission('content'));

drop policy if exists "raids_update_auth" on public.raids;
create policy "raids_update_auth"
  on public.raids for update
  using (public.has_permission('content'));

drop policy if exists "raids_delete_auth" on public.raids;
create policy "raids_delete_auth"
  on public.raids for delete
  using (public.has_permission('content'));

-- 3) Seed: las 6 guías legendarias traídas de la web del miembro
-- (idempotente: solo inserta las que falten por título)

-- ── HEATRAN ──────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from public.raids where title = 'Heatran: Incursión Legendaria') then
    insert into public.raids (title, excerpt, content, categories, tags)
    values (
      'Heatran: Incursión Legendaria',
      'Heatran combina los tipos Fuego y Acero, convirtiéndose en un rival resistente que requiere una selección cuidadosa de Pokémon y una estrategia coordinada.',
      $h$
GUIA #01 - LEGENDARIO
Estrategia completa para conquistar la incursion
Creditos para IPHOBOS.

TIPO: Fuego / Acero

ROLES POR JUGADOR
- P:01 - Primer Personaje: quitarle el objeto a Heatran para que no se recupere vida de manera constante.
- P:02 - Segundo Personaje: quitarle el escudo a Heatran para maximizar el daño.
- P:03 - Tercer Personaje: despejar el campo para no recibir dano al entrar al campo.
- P:04 - Cuarto Personaje: quitar las rocas y colocar el Hidrochorro para evitar las quemaduras.

SECUENCIA DE TURNOS
TURNO 1:
  J1 - Ladron (Weavile)
  J2 - A Bocajarro (Medicham)
  J3 - A Bocajarro (Medicham)
  J4 - A Bocajarro (Medicham)
TURNO 2:
  J1 - A Bocajarro (Heracross)
  J2 - A Bocajarro (Heracross)
  J3 - A Bocajarro (Heracross)
  J4 - A Bocajarro (Heracross)
TURNO 3:
  J1 - Poder Oculto Tierra (Espeon)
  J2 - Poder Oculto Tierra (Espeon)
  J3 - Despejar (Xatu)
  J4 - Despejar (Xatu)
TURNO 4:
  J1 - Pantalla Luz (Rotom)
  J2 - Hidrobomba (Kingdra)
  J3 - Tierra Viva (Flygon)
  J4 - Hidrochorro (Pelipper)
TURNO 5:
  J1 - Hidrobomba (Politoed)
  J2 - Hidrobomba (Kingdra)
  J3 - Tierra Viva (Flygon)
  J4 - Tierra Viva (Flygon)
TURNO 6:
  J1 - Salmuera (Kingdra)
  J2 - Salmuera (Kingdra)
  J3 - Tierra Viva (Flygon)
  J4 - Tierra Viva (Flygon)
TURNO 7:
  J1 - Salmuera (Kingdra)
  J2 - Falso Llanto (Whimsicott)
  J3 - Meteorobola (Politoed)
  J4 - Salmuera (Kingdra)
TURNO 8:
  J1 - Salmuera (Kingdra)
  J2 - Meteorobola (Politoed)
  J3 - Salmuera (Kingdra)
  J4 - Salmuera (Kingdra)
TURNO 9 (final):
  J1 - Salmuera (Kingdra)
  J2 - X
  J3 - Salmuera (Kingdra)
  J4 - Salmuera (Kingdra)

EQUIPOS POR JUGADOR

== JUGADOR 1 (P:01) ==

WEAVILE
- IVs: x/31/x/x/x/31
- EVs: 252 velocidad
- Naturaleza: cualquiera que suba velocidad
- Habilidad: no importa
- Objeto: NINGUNO
- Rol: quitarle el item a Heatran
- Moveset: LADRON

HERRACROSS
- IVs: x/31/x/x/x/31
- EVs: 252 velocidad
- Naturaleza: cualquiera que suba ataque
- Habilidad: Agallas
- Objeto: Cinta Elegida (Choice Band)
- Rol: maximo dano a Heatran
- Moveset: A BOCAJARRO

ESPEON
- IVs: x/x/x/31/x/31
- EVs: 252 ataque especial y velocidad
- Naturaleza: Modesta / Afable / Alocada
- Habilidad: Espejo Magico
- Objeto: Gema Tierra
- Rol: evitar el Rugido de Heatran
- Moveset: PODER OCULTO TIERRA

ROTOM (FORMA LAVADORA)
- IVs: x/x/x/x/x/31
- EVs: 252 velocidad
- Naturaleza: cualquiera superando 259 de Velocidad
- Habilidad: Levitacion
- Objeto: Reflejaluz
- Rol: colocar pantallas
- Moveset: PANTALLA DE LUZ

POLITOED
- IVs: 25+/x/20+/31/25+/31
- EVs: 252 SpAtk / 252 Vel / 6 SpDef
- Naturaleza: Miedosa
- Habilidad: Llovizna
- Objeto: Gafas Elegidas
- Rol: colocar la lluvia
- Moveset: HIDROBOMBA / METEOROBOLA

KINGDRA
- IVs: 31/x/28+/31/28+/28+
- EVs: 252 PS / 252 SpAtk / 6 SpDef
- Naturaleza: Modesta
- Habilidad: Nado Rapido
- Objeto: Chaleco de Asalto
- Rol: dano sostenido
- Moveset: SALMUERA

== JUGADOR 2 (P:02) ==

MEDICHAM
- IVs: x/31/x/x/x/31
- EVs: 252 Atk / 252 Vel
- Naturaleza: Firme / Picara / Hurana
- Habilidad: Energia Pura
- Objeto: Cinta Elegida
- Rol: dano puro
- Moveset: LADRON

HERRACROSS
- IVs: x/31/x/x/x/31
- EVs: 252 velocidad
- Naturaleza: Firme / Picara / Hurana
- Habilidad: Agallas
- Objeto: Vidaesfera
- Rol: maximo dano a Heatran
- Moveset: A BOCAJARRO

ESPEON
- IVs: x/x/x/31/x/31
- EVs: 252 ataque especial y velocidad
- Naturaleza: Modesta / Afable / Alocada
- Habilidad: Espejo Magico
- Objeto: Gema Tierra
- Rol: evitar el Rugido de Heatran
- Moveset: PODER OCULTO TIERRA

KINGDRA
- IVs: 31/x/28+/31/28+/28+
- EVs: 252 PS / 252 SpAtk / 6 SpDef
- Naturaleza: Modesta
- Habilidad: Nado Rapido
- Objeto: Chaleco de Asalto
- Rol: dano sostenido
- Moveset: HIDROBOMBA

WHIMSICOTT
- IVs: no importa
- EVs: no importa
- Naturaleza: neutral (que no suba Defensa Especial)
- Habilidad: Bromista
- Objeto: Banda Focus
- Rol: romper la pasiva Escudo
- Moveset: LLANTOFALSO (Falso Llanto)

POLITOED
- IVs: 25+/x/20+/31/25+/31
- EVs: 252 SpAtk / 252 Vel / 6 SpDef
- Naturaleza: Miedosa
- Habilidad: Llovizna
- Objeto: Gafas Elegidas
- Rol: colocar la lluvia
- Moveset: HIDROBOMBA / METEOROBOLA

== JUGADOR 3 (P:03) ==

MEDICHAM
- IVs: x/31/x/x/x/31
- EVs: 252 Atk / 252 Vel
- Naturaleza: Firme / Picara / Hurana
- Habilidad: Energia Pura
- Objeto: Cinta Elegida
- Rol: dano puro
- Moveset: LADRON

HERRACROSS
- IVs: x/31/x/x/x/31
- EVs: 252 velocidad
- Naturaleza: Firme / Picara / Hurana
- Habilidad: Agallas
- Objeto: Vidaesfera
- Rol: maximo dano a Heatran
- Moveset: A BOCAJARRO

XATU
- IVs: x/x/x/x/x/31
- EVs: 252 velocidad
- Naturaleza: cualquiera superando 259 de Velocidad
- Habilidad: Espejo Magico
- Objeto: no importa
- Rol: despejar y evitar Rugido
- Moveset: DESPEJAR

FLYGON
- IVs: 31/x/28+/31/28+/31
- EVs: 118 PS / 252 SpAtk / 140 Vel
- Naturaleza: Modesta
- Habilidad: Levitar
- Objeto: Gafas Elegidas
- Rol: tanquear + dano
- Moveset: TIERRA VIVA

POLITOED
- IVs: 25+/x/20+/31/25+/31
- EVs: 252 SpAtk / 252 Vel / 6 SpDef
- Naturaleza: Miedosa
- Habilidad: Llovizna
- Objeto: Gema Agua
- Rol: colocar la lluvia
- Moveset: METEOROBOLA

KINGDRA
- IVs: 31/x/28+/31/28+/28+
- EVs: 252 PS / 252 SpAtk / 6 SpDef
- Naturaleza: Modesta
- Habilidad: Nado Rapido
- Objeto: Chaleco de Asalto
- Rol: dano sostenido
- Moveset: HIDROBOMBA / SALMUERA

== JUGADOR 4 (P:04) ==

MEDICHAM
- IVs: x/31/x/x/x/31
- EVs: 252 Atk / 252 Vel
- Naturaleza: Firme / Picara / Hurana
- Habilidad: Energia Pura
- Objeto: Cinta Elegida
- Rol: dano puro
- Moveset: LADRON

HERRACROSS
- IVs: x/31/x/x/x/31
- EVs: 252 velocidad
- Naturaleza: Firme / Picara / Hurana
- Habilidad: Agallas
- Objeto: Vidaesfera
- Rol: maximo dano a Heatran
- Moveset: A BOCAJARRO

XATU
- IVs: x/x/x/x/x/31
- EVs: 252 velocidad
- Naturaleza: cualquiera superando 259 de Velocidad
- Habilidad: Espejo Magico
- Objeto: no importa
- Rol: despejar y evitar Rugido
- Moveset: DESPEJAR

PELIPPER
- IVs: x/x/x/x/x/31
- EVs: 252 Vel
- Naturaleza: cualquiera que no baje Velocidad
- Habilidad: Llovizna
- Objeto: Panuelo Elegido
- Rol: reducir dano tipo Fuego
- Moveset: HIDROCHORRO

FLYGON
- IVs: 31/x/28+/31/28+/31
- EVs: 118 PS / 252 SpAtk / 140 Vel
- Naturaleza: Modesta
- Habilidad: Levitar
- Objeto: Gafas Elegidas
- Rol: tanquear + dano
- Moveset: TIERRA VIVA

KINGDRA
- IVs: 31/x/28+/31/28+/28+
- EVs: 252 PS / 252 SpAtk / 6 SpDef
- Naturaleza: Modesta
- Habilidad: Nado Rapido
- Objeto: Chaleco de Asalto
- Rol: dano sostenido
- Moveset: HIDROBOMBA / SALMUERA

CONSEJOS
- El Ladron (Weavile/Medicham) roba el objeto a Heatran para evitar que se recupere vida constantemente.
- Espeon/Xatu con Espejo Magico y Poder Oculto Tierra / Despejar evitan el Rugido de Heatran.
- Pelipper con Hidrochorro y Llovizna reduce el dano de tipo Fuego (evita quemaduras).
- Whimsicott con Bromista y Falso Llanto rompe la pasiva Escudo.
$h$,
      array['Raids Legendarias'],
      array['Heatran', 'Fuego', 'Acero', 'Ladron', 'Espeon']
    );
  end if;
end $$;

-- ── CRESSELIA ────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from public.raids where title = 'Cresselia: Incursión Legendaria') then
    insert into public.raids (title, excerpt, content, categories, tags)
    values (
      'Cresselia: Incursión Legendaria',
      'Cresselia es de tipo Psíquico, destaca por su gran resistencia y por su capacidad de mantenerse en combate durante largos periodos, por lo que cuesta mucho debilitarla.',
      $c$
GUIA #02 - LEGENDARIO
Estrategia completa para conquistar la incursion
Estrategia desarrollada por Kriptonito, Kalfff, Rockerito y PAXPO.

TIPO: Psiquico

ROLES POR JUGADOR
- P:01 - Primer Personaje: asegurar maximo dano en los primeros turnos.
- P:02 - Segundo Personaje: aguantar los ultimos turnos para asegurar la baja de Cresselia.
- P:03 - Tercer Personaje: hacer maximo dano en todos los turnos.
- P:04 - Cuarto Personaje: asegurar el aguante con pantalla en los primeros turnos.

SECUENCIA DE TURNOS
TURNO 1 (85%):
  J1 - Golpe Bajo (Bisharp)
  J2 - Golpe Bajo (Bisharp)
  J3 - Golpe Bajo (Bisharp)
  J4 - Golpe Bajo (Bisharp)
TURNO 2 (75%):
  J1 - Lanzamiento (Weavile)
  J2 - Bomba Acida (Vileplume)
  J3 - Infortunio (Mismagius)
  J4 - Infortunio (Gengar)
TURNO 3 (64%):
  J1 - Tijera X (Scyther)
  J2 - Infortunio (Chandelure)
  J3 - Buena Baza (Krookodile)
  J4 - Pantalla de Luz (Vanillux)
TURNO 4 (58%):
  J1 - Seduccion (Blissey)
  J2 - Psicoonda (Blissey)
  J3 - Buena Baza (Krookodile)
  J4 - Seduccion (Blissey)
TURNO 5 (50%):
  J1 - Psicoonda (Blissey)
  J2 - Mov. Sismico (Blissey)
  J3 - Buena Baza (Krookodile)
  J4 - Psicoonda (Blissey)
TURNO 6 (44%):
  J1 - Psicoonda (Blissey)
  J2 - Mov. Sismico (Blissey)
  J3 - Buena Baza (Krookodile)
  J4 - Psicoonda (Blissey)
TURNO 7 (40%):
  J1 - Mov. Sismico (Blissey)
  J2 - Psicoonda (Blissey)
  J3 - Mov. Sismico (Blissey)
  J4 - Psicoonda (Blissey)
TURNO 8 (38%):
  J1 - Mov. Sismico (Blissey)
  J2 - Pantalla de Luz (Blissey)
  J3 - Velo Sagrado (Blissey)
  J4 - Psicoonda (Blissey)

NOTA: si las gordas duran un turno adicional, usa Deseo con el Jugador 1 y Toxico con el Jugador 3.

TURNO 9 (28%):
  J1 - Seduccion (Armaldo)
  J2 - Bola Sombra (Gothitelle)
  J3 - Buena Baza (Tyranitar)
  J4 - Llanto Falso (Gothitelle)
TURNO 10 (18%):
  J1 - Mov. Sismico (Armaldo)
  J2 - Bola Sombra (Gothitelle)
  J3 - Buena Baza (Tyranitar)
  J4 - Bola Sombra (Gothitelle)
TURNO 11 (8%):
  J1 - Psicoonda (Snorlax)
  J2 - Psicoonda (Electabuzz)
  J3 - Buena Baza (Tyranitar)
  J4 - Buena Baza (Hydreigon)
TURNO 12 (0%):
  J1 - Psicoonda (Snorlax)
  J2 - Psicoonda (Electabuzz)
  J3 - Buena Baza (Tyranitar)
  J4 - Buena Baza (Hydreigon)

EQUIPOS POR JUGADOR

== JUGADOR 1 (P:01) ==

BISHARP
- Nivel: 100
- IVs: x/31/x/x/x/x
- EVs: 252 ataque
- Naturaleza: Firme / Hurana / Picara
- Habilidad: Competitivo
- Objeto: Cinta Elegida
- Rol: aprovechar los cambios de estadisticas del rival
- Moveset: GOLPE BAJO

WEAVILE
- Nivel: 100
- IVs: x/31/x/x/x/31
- EVs: 252 ataque / 252 velocidad
- Naturaleza: Firme / Hurana / Picara
- Habilidad: Presion
- Objeto: Flecha Veneno
- Rol: aprovechar el objeto del rival
- Moveset: LANZAMIENTO

SCYTHER
- Nivel: 100 (272 Vel)
- IVs: 31/31/x/x/31/31
- EVs: 252 ataque / 152 defensa especial / 104 velocidad
- Naturaleza: Firme
- Habilidad: Enjambre
- Objeto: Poliza de Tipo
- Rol: atacante fisico rapido
- Moveset: TIJERA X

BLISSEY
- Nivel: 100 (145 Vel)
- IVs: 31/x/x/x/31/30
- EVs: 252 PS / 252 defensa especial / 0 velocidad
- Naturaleza: Serena / Cauta / Amable
- Habilidad: NINGUNA
- Objeto: Manto Encubierto
- Rol: soporte y resistencia especial
- Moveset: MOV. SISMICO / PSICOONDA / DESEO / SEDUCCION

ARMALDO
- Nivel: 100 (85 Vel)
- IVs: 31/0/x/x/31/0
- EVs: 252 PS / 252 defensa especial
- Naturaleza: Grosera
- Habilidad: Armadura Batalla
- Objeto: Baya Guaya
- Rol: pokemon resistente y de apoyo
- Moveset: MOV. SISMICO / ESTOCISMO / SEDUCCION

SNORLAX
- Nivel: 100 (82 Vel)
- IVs: 31/x/x/x/31/15
- EVs: 252 PS / 252 defensa especial
- Naturaleza: Serena / Cauta
- Habilidad: NINGUNA
- Objeto: Equipo de Asalto
- Rol: pokemon resistente y de apoyo
- Moveset: PSICOONDA / MOV. SISMICO

== JUGADOR 2 (P:02) ==

BISHARP
- Nivel: 100
- IVs: x/31/x/x/x/x
- EVs: 252 ataque
- Naturaleza: Firme / Hurana / Picara
- Habilidad: Competitivo
- Objeto: Cinta Elegida
- Rol: atacante fisico
- Moveset: GOLPE BAJO

VILEPLUME
- Nivel: 100
- IVs: x/x/x/31/x/31
- EVs: 252 ataque especial / 252 velocidad
- Naturaleza: Modesta
- Habilidad: Clorofila
- Objeto: Gafas Elegidas
- Rol: atacante especial
- Moveset: BOMBA ACIDA

CHANDELURE
- Nivel: 100
- IVs: x/x/x/31/x/31
- EVs: 252 ataque especial / 200 velocidad
- Naturaleza: Miedosa
- Habilidad: Absorbe Fuego
- Objeto: Gema Fantasma
- Rol: atacante especial
- Moveset: INFORTUNIO

BLISSEY
- Nivel: 100 (131 Vel)
- IVs: 31/x/x/x/31/15
- EVs: 252 PS / 252 defensa especial / 6 velocidad
- Naturaleza: Serena / Cauta / Amable
- Habilidad: NINGUNA
- Objeto: Manto Encubierto
- Rol: soporte y resistencia especial
- Moveset: MOV. SISMICO / PSICOONDA / VELO SAGRADO / PANTALLA DE LUZ

GOTHITELLE
- Nivel: 100
- IVs: 31/x/x/31/31/31
- EVs: 6 PS / 220 ataque especial / 252 defensa especial / 32 velocidad
- Naturaleza: Modesta
- Habilidad: Competitivo
- Objeto: Baya Drasi
- Rol: atacante especial y apoyo
- Moveset: BOLA SOMBRA / GOLPE CUERPO

ELECTABUZZ
- Nivel: 100 (235 Vel)
- IVs: 31/x/x/x/31/20
- EVs: 252 PS / 252 defensa especial / 0 velocidad
- Naturaleza: Serena / Cauta
- Habilidad: Espiritu Vital
- Objeto: Mineral Evolutivo
- Rol: soporte y resistencia
- Moveset: PSICOONDA / MOV. SISMICO / PANTALLA LUZ

== JUGADOR 3 (P:03) ==

BISHARP
- Nivel: 100
- IVs: x/31/x/x/x/x
- EVs: 252 ataque
- Naturaleza: Firme / Hurana / Picara
- Habilidad: Competitivo
- Objeto: Gema Siniestra
- Rol: atacante fisico
- Moveset: GOLPE BAJO

MISMAGIUS
- Nivel: 100 (309 Vel)
- IVs: x/x/x/31/x/31
- EVs: 252 ataque especial / 252 velocidad
- Naturaleza: Modesta
- Habilidad: Levitacion
- Objeto: Gafas Elegidas
- Rol: atacante especial rapido
- Moveset: INFORTUNIO

KROOKODILE
- Nivel: 100
- IVs: 31/31/x/x/31/31
- EVs: 6 PS / 252 ataque / 252 defensa especial
- Naturaleza: Firme
- Habilidad: Irrascible
- Objeto: Poliza de Tipo
- Rol: atacante fisico
- Moveset: BUENA BAZA

BLISSEY
- Nivel: 100 (117 Vel)
- IVs: 31/x/x/x/31/15
- EVs: 252 PS / 252 defensa especial / 0 velocidad
- Naturaleza: Grosera
- Habilidad: NINGUNA
- Objeto: Manto Encubierto
- Rol: soporte y resistencia especial
- Moveset: MOV. SISMICO / PSICOONDA / TOXICO / VELO SAGRADO

TYRANITAR
- Nivel: 100 (158 Vel)
- IVs: 31/31/x/x/31/31
- EVs: 6 PS / 252 ataque / 252 defensa especial
- Naturaleza: Firme
- Habilidad: Chorro Arena
- Objeto: Cinta Elegida
- Rol: atacante fisico y control del clima
- Moveset: BUENA BAZA / TRITURAR

BRONZONG
- Nivel: 100 (77 Vel)
- IVs: 31/x/x/x/31/0
- EVs: 252 PS / 252 defensa especial
- Naturaleza: Grosera
- Habilidad: Ignifugo
- Objeto: Baya Guaya
- Rol: pokemon resistente y de apoyo
- Moveset: PSICOONDA / GIRO BOLA / DESCANSO / TOXICO

== JUGADOR 4 (P:04) ==

BISHARP
- Nivel: 100
- IVs: x/31/x/x/x/x
- EVs: 252 ataque
- Naturaleza: Firme / Hurana / Picara
- Habilidad: Competitivo
- Objeto: Gema Siniestra
- Rol: atacante fisico
- Moveset: GOLPE BAJO

GENGAR
- Nivel: 100 (304 Vel)
- IVs: +20/x/x/31/+20/31
- EVs: 252 ataque especial / 58 defensa especial / 202 velocidad
- Naturaleza: Modesta
- Habilidad: Cuerpo Maldito
- Objeto: Gafas Elegidas
- Rol: atacante especial rapido
- Moveset: INFORTUNIO

VANILLUX
- Nivel: 100
- IVs: +25/x/x/x/+25/31
- EVs: 252 defensa especial / 252 velocidad
- Naturaleza: Miedosa
- Habilidad: Nevada
- Objeto: Panuelo Eleccion
- Rol: soporte y colocacion de pantallas
- Moveset: PANTALLA DE LUZ

BLISSEY
- Nivel: 100 (103 Vel)
- IVs: 31/x/x/x/31/0
- EVs: 252 PS / 252 defensa especial / 0 velocidad
- Naturaleza: Grosera
- Habilidad: NINGUNA
- Objeto: Manto Encubierto
- Rol: soporte y resistencia especial
- Moveset: MOV. SISMICO / PSICOONDA / PULSO CURA / SEDUCCION

GOTHITELLE
- Nivel: 100
- IVs: 31/x/x/31/31/0
- EVs: 6 PS / 252 ataque especial / 252 defensa especial / 0 velocidad
- Naturaleza: Mansa
- Habilidad: Competitivo
- Objeto: Baya Drasi
- Rol: atacante especial y apoyo
- Moveset: BOLA SOMBRA / GOLPE CUERPO / LLANTO FALSO

HYDREIGON
- Nivel: 100 (237 Vel)
- IVs: 31/31/x/x/31/31
- EVs: 252 ataque / 232 defensa especial / 20 velocidad
- Naturaleza: Firme
- Habilidad: Levitacion
- Objeto: Cinta Elegida
- Rol: atacante fisico y apoyo
- Moveset: BUENA BAZA

CONSEJOS
- Los porcentajes marcan la salud aproximada de Cresselia al final de cada turno.
- Las "gordas" (Blissey) son el pilar de la resistencia; Psicoonda y Mov. Sismico hacen dano fijo sin depender de estadisticas.
- Si las gordas necesitan un turno extra: Deseo (J1) + Toxico (J3).
$c$,
      array['Raids Legendarias'],
      array['Cresselia', 'Psiquico', 'Blissey', 'Golpe Bajo']
    );
  end if;
end $$;

-- ── MELOETTA ─────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from public.raids where title = 'Meloetta: Incursión Legendaria') then
    insert into public.raids (title, excerpt, content, categories, tags)
    values (
      'Meloetta: Incursión Legendaria',
      'Estrategia Starfall optimizada: cuatro jugadores con equipos preparados para manipular la IA, controlar la velocidad de los Slowbro y ejecutar una secuencia exacta de turnos.',
      $m$
GUIA #02 - LEGENDARIO
Estrategia Starfall optimizada - guia completa

TIPO: Normal / Psiquico

OBJETIVO
Manipular la IA de Meloetta, controlar la velocidad de los Slowbro (los 4 deben ir en un orden exacto) y ejecutar la secuencia para llevar a Meloetta hasta su derrota. Conceptos clave: Conjuro, Velo Sagrado, Mas Psique, Gravedad y Espacio Raro.

SECUENCIA DE TURNOS
TURNO 1 (96.4%):
  J1 - Conjuro (Raichu)
  J2 - Truco / Chimecho (Mr. Mime)
  J3 - Lanzamiento (Krookodile)
  J4 - Gravedad (Jirachi)
TURNO 2 (84.4%):
  J1 - Megacuerno (Heracross)
  J2 - Buena Baza (Krookodile)
  J3 - Megacuerno (Scolipede)
  J4 - Velo Sagrado (Jirachi)
TURNO 3 (76.2%):
  J1 - Alarido (Suicune)
  J2 - Alarido (Arcanine)
  J3 - Zumbido (Volcarona)
  J4 - Eco Metalico (Jirachi)
TURNO 4 (65.5%):
  J1 - Ultimo Lugar (Suicune)
  J2 - Megacuerno (Escavalier)
  J3 - Zumbido (Volcarona)
  J4 - Buena Baza (Honchkrow)
TURNO 5 (49.9%):
  J1 - Lanzamiento (Crawdaunt)
  J2 - Picadura (Dusclops)
  J3 - Lanzamiento (Crawdaunt)
  J4 - Megacuerno (Escavalier)
TURNO 6 (44.5%):
  J1 - Mas Psique (Slowbro) sobre Meloetta
  J2 - Lanzamiento (Dusclops) sobre Meloetta
  J3 - Reflejo (Reuniclus)
  J4 - Conjuro (Musharna)
TURNO 7 (38.8%):
  J1 - Psiquico (Slowbro)
  J2 - Mas Psique (Slowbro) sobre Meloetta
  J3 - Velo Sagrado (Reuniclus)
  J4 - Gravedad (Musharna)
TURNO 8 (26.2%):
  J1 - Psiquico (Slowbro)
  J2 - Onda Certera (Slowbro)
  J3 - Espacio Raro (Slowbro)
  J4 - Encanto (Reuniclus)
TURNO 9 (22.2%):
  J1 - Defensa Ferrea (Slowbro)
  J2 - Onda Certera (Slowbro)
  J3 - Mas Psique (Slowbro) sobre PJ2
  J4 - Mas Psique (Slowbro) sobre PJ3
TURNO 10 (11.9%):
  J1 - Relajo (Slowbro)
  J2 - Mas Psique (Slowbro) sobre cualquiera
  J3 - Psiquico (Slowbro)
  J4 - Onda Certera (Slowbro)
TURNO 11 (FIN):
  J1 - A Bocajarro (Conkeldurr)
  J2 - Psiquico (Slowbro)
  J3 - Onda Certera (Slowbro)
  J4 - Psiquico (Slowbro)

EQUIPOS POR JUGADOR

== JUGADOR 1 (P:01) ==

RAICHU
- Nivel: 100
- IVs: 31/x/x/x/31/31
- EVs: 252/x/x/x/140/98
- Naturaleza: Serena
- Habilidad: Pararrayos (Habilidad Oculta)
- Objeto: Baya Magua
- Moveset: CONJURO
- Nota: Conjuro es obligatorio y debe ser movimiento huevo.

HERACROSS
- Nivel: 100
- IVs: x/31/x/x/x/31
- EVs: x/252/x/x/x/196
- Naturaleza: Alegre
- Habilidad: Enjambre
- Objeto: Cinta Elegida
- Moveset: MEGACUERNO

SUICUNE
- Nivel: 100
- IVs: 31/x/x/x/20/31
- EVs: 6/x/x/x/x/204
- Naturaleza: Miedosa
- Habilidad: Presion
- Objeto: Manto Encubierto
- Moveset: ALARIDO / ULTIMO LUGAR
- Nota: Suicune debe tener exactamente 20 de Defensa Especial.

CONKELDURR
- Nivel: 100
- IVs: x/31/x/x/x/0
- EVs: x/252/x/x/x/x
- Naturaleza: Audaz
- Habilidad: Potencia Bruta
- Objeto: Vidaesfera
- Moveset: A BOCAJARRO

SLOWBRO
- Nivel: 100
- IVs: 31/x/31/+29/20-25/10
- EVs: 252/x/252/6/x/x
- Naturaleza: Placida
- Habilidad: Despiste
- Objeto: Casco Dentado
- Moveset: MAS PSIQUE / PSIQUICO / DEFENSA FERREA / RELAJO
- Nota: su velocidad debe superar a la del Slowbro del PJ2. Despiste manipula la IA de Chimecho.

CRAWDAUNT
- Nivel: 100
- IVs: x/31/x/x/x/0
- EVs: x/252/x/x/x/x
- Naturaleza: Audaz
- Habilidad: Adaptable (Habilidad Oculta)
- Objeto: Bola Ferrea
- Moveset: LANZAMIENTO

== JUGADOR 2 (P:02) ==

MR. MIME
- Nivel: 100
- IVs: 31/x/x/x/31/31
- EVs: 106/x/x/x/x/x
- Naturaleza: Neutra
- Habilidad: Insonorizar
- Objeto: Panuelo Elegido
- Moveset: TRUCO

KROOKODILE
- Nivel: 100
- IVs: x/31/x/x/x/31
- EVs: x/252/x/x/x/252
- Naturaleza: Firme
- Habilidad: Intimidacion
- Objeto: Cinta Elegida
- Moveset: BUENA BAZA

ENTEI
- Nivel: 100
- IVs: 31/x/x/x/15/31
- EVs: x/x/x/x/x/176
- Naturaleza: Afable
- Habilidad: Presion
- Objeto: Baya Magua
- Moveset: ALARIDO
- Alternativa: Arcanine ocupando el rol; si usas Arcanine, el objeto intercambiado debe ser obligatoriamente el Panuelo Elegido.

ESCAVALIER
- Nivel: 100
- IVs: x/31/x/x/15/0
- EVs: x/252/x/x/200/52
- Naturaleza: Audaz
- Habilidad: Enjambre
- Objeto: Banda Focus
- Moveset: MEGACUERNO / PICADURA

DUSCLOPS
- Nivel: 100
- IVs: 31/x/0/x/x/x
- EVs: 44/x/112/x/x/x
- Naturaleza: Neutra
- Habilidad: Presion
- Objeto: Llamaesfera
- Moveset: LANZAMIENTO
- Nota: cualquier naturaleza que no aumente Defensa.

SLOWBRO
- Nivel: 100
- IVs: 31/x/31/+29/+29/5
- EVs: 252/x/252/6/x/x
- Naturaleza: Placida
- Habilidad: Despiste
- Objeto: Casco Dentado
- Moveset: MAS PSIQUE / ONDA CERTERA / PSIQUICO / SALMUERA
- Nota: obligatoriamente el mas lento de los 4 Slowbro. Defensa Especial 29+.

== JUGADOR 3 (P:03) ==

KROOKODILE
- Nivel: 100
- IVs: x/31/x/x/x/31
- EVs: x/252/x/x/x/252
- Naturaleza: Firme
- Habilidad: Intimidacion
- Objeto: Flecha Veneno
- Moveset: LANZAMIENTO

SCOLIPEDE
- Nivel: 100
- IVs: 20-25/31/x/x/20-25/31
- EVs: 80/252/x/x/80/96
- Naturaleza: Firme
- Habilidad: Punto Toxico
- Objeto: Cinta Elegida
- Moveset: MEGACUERNO

VOLCARONA
- Nivel: 100
- IVs: 31/x/x/31/+29/31
- EVs: x/x/x/252/70/182
- Naturaleza: Modesta
- Habilidad: Cuerpo Llama
- Objeto: Gafas Elegidas
- Moveset: ZUMBIDO

CRAWDAUNT
- Nivel: 100
- IVs: x/31/x/x/x/0-16
- EVs: x/252/x/x/x/32
- Naturaleza: Audaz
- Habilidad: Adaptable (Habilidad Oculta)
- Objeto: Bola Ferrea
- Moveset: LANZAMIENTO

REUNICLUS
- Nivel: 100
- IVs: 31/x/31/x/31/0
- EVs: 252/x/192/x/46/x
- Naturaleza: Placida
- Habilidad: Muro Magico
- Objeto: Casco Dentado
- Moveset: REFLEJO / VELO SAGRADO

SLOWBRO
- Nivel: 100
- IVs: 31/x/31/+29/20-25/15
- EVs: 252/x/252/6/x/x
- Naturaleza: Placida
- Habilidad: Despiste
- Objeto: Baya Drasi
- Moveset: ESPACIO RARO / MAS PSIQUE / ONDA CERTERA / PSIQUICO
- Nota: Defensa Especial entre 20 y 25; mas rapido que el Slowbro del PJ2 y mas lento que el del PJ4.

== JUGADOR 4 (P:04) ==

JIRACHI
- Nivel: 100
- IVs: 31/x/x/x/31/31
- EVs: 42/x/x/x/110/196 (exactamente estos)
- Naturaleza: Cauta
- Habilidad: Dicha
- Objeto: Manto Encubierto
- Moveset: GRAVEDAD / VELO SAGRADO / ECO METALICO

HONCHKROW
- Nivel: 100
- IVs: +29/31/31/x/+29/31
- EVs: x/252/x/x/44/212
- Naturaleza: Firme
- Habilidad: Afortunado
- Objeto: Vidaesfera
- Moveset: BUENA BAZA

MUSHARNA
- Nivel: 100
- IVs: 31/x/31/x/31/0
- EVs: 252/x/252/x/x/x
- Naturaleza: Osada
- Habilidad: Sincronia
- Objeto: Baya Jaboca
- Moveset: CONJURO / GRAVEDAD
- Nota: no necesita 0 IVs de Velocidad.

ESCAVALIER
- Nivel: 100
- IVs: 15/31/x/x/15/0
- EVs: x/252/x/x/x/216
- Naturaleza: Audaz
- Habilidad: Enjambre
- Objeto: Banda Focus
- Moveset: MEGACUERNO
- Nota: Velocidad 88 (+89) para superar a Meloetta durante Espacio Raro.

REUNICLUS
- Nivel: 100
- IVs: 31/x/31/x/31/0
- EVs: 252/x/252/x/x/x
- Naturaleza: Placida
- Habilidad: Funda
- Objeto: Casco Dentado
- Moveset: ENCANTO
- Nota: obligatoriamente 0 IVs de Velocidad y el mas lento.

SLOWBRO
- Nivel: 100
- IVs: 31/x/31/+29/31/20
- EVs: 242/x/252/x/16/x
- Naturaleza: Placida
- Habilidad: Despiste
- Objeto: Baya Pabaya
- Moveset: MAS PSIQUE / PSIQUICO / ONDA CERTERA / SALMUERA
- Nota: 31 IVs en Defensa Especial para que Exploud nunca lo ataque; no necesita exactamente 20 de Velocidad.

VELOCIDADES CLAVE DE LOS CRAWDAUNT
- Crawdaunt PJ1: 51
- Crawdaunt PJ2: 52
- Crawdaunt PJ3: 53
- Crawdaunt PJ4: +89, para superar a Meloetta

CONDICIONES PARA REINICIAR
- Reiniciar si Meloetta prioriza a Jirachi en lugar de Raichu.
- Reiniciar si Chimecho confunde a Krookodile y se golpea a si mismo.
- Reiniciar si Meloetta no derrota a Jirachi tras 2 Rayo Carga.
- Reiniciar si Escavalier muere.
- Reiniciar si Meloetta no cambia de forma con al menos +4 en Ataque Especial.
- El Slowbro del PJ2 debe ser mas lento que el del PJ1; Reuniclus mas lento que los Slowbro de PJ1 y PJ2.
- Meloetta deberia priorizar al Slowbro del PJ4; en el ultimo tramo se enfurece con el PJ1 y deja libre al PJ4.
$m$,
      array['Raids Legendarias'],
      array['Meloetta', 'Normal', 'Psiquico', 'Starfall', 'Slowbro']
    );
  end if;
end $$;

-- ── COBALION ─────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from public.raids where title = 'Cobalion: Incursión Legendaria') then
    insert into public.raids (title, excerpt, content, categories, tags)
    values (
      'Cobalion: Incursión Legendaria',
      'Estrategia GOAT de todos los tiempos (The Council) para derrotar a Cobalion 6 estrellas. Con las builds correctas funciona con 0 RNG y requiere coordinacion exacta entre los 4 jugadores.',
      $co$
GUIA #04 - LEGENDARIO
Estrategia GOAT de todos los tiempos - The Council
Incursion de Cobalion 6 estrellas. Con las builds correctas funciona con 0 RNG.

TIPO: Acero / Lucha

SECUENCIA DE TURNOS
TURNO 1 (~88.5%):
  J1 - Envite Ignio (Darmanitan)
  J2 - Envite Ignio (Darmanitan)
  J3 - Meteorobola (Ninetales)
  J4 - Reflejo (Jirachi)
TURNO 2 (~76.6%):
  J1 - Meteorobola (Charizard)
  J2 - Meteorobola (Charizard)
  J3 - Meteorobola (Charizard)
  J4 - Conjuro (Jirachi)
TURNO 3 (~72.6%):
  J1 - Espacio Raro (Reuniclus)
  J2 - Tierra Viva (Nidoking)
  J3 - Trapicheo (Whimsicott)
  J4 - Pantalla Luz (Jirachi)
TURNO 4 (~60.2%):
  J1 - Gravedad (Reuniclus)
  J2 - Tierra Viva (Nidoking)
  J3 - Onda Certera (Ampharos)
  J4 - Onda Certera (Ampharos)
TURNO 5 (~43.9%):
  J1 - Onda Certera (Ampharos)
  J2 - Onda Certera (Ampharos)
  J3 - Onda Certera (Ampharos)
  J4 - Onda Certera (Ampharos)
TURNO 6 (~28.6%):
  J1 - Onda Certera (Ampharos)
  J2 - Salmuera (Kingdra)
  J3 - Onda Certera (Ampharos)
  J4 - Tierra Viva (Nidoking)
TURNO 7 (~13.3%):
  J1 - Onda Certera (Lucario)
  J2 - Salmuera (Kingdra)
  J3 - Onda Certera (Lucario)
  J4 - Onda Certera (Lucario)
TURNO 8 (~1.6%):
  J1 - Hidrocanyon (Empoleon)
  J2 - Hidrocanyon (Empoleon)
  J3 - Hidrocanyon (Empoleon)
  J4 - Ultimo Lugar (Murkrow)
TURNO 9 (~-2.9%):
  J1 - (sin accion)
  J2 - (sin accion)
  J3 - (sin accion)
  J4 - Proteccion (Ferrothorn)

EQUIPOS POR JUGADOR

== JUGADOR 1 (P:01) ==
Activa el clima y prepara el dano final con Lucario y Empoleon.

DARMANITAN
- Nivel: 100
- IVs: 0+ ataque / 0+ velocidad
- EVs: 252 ataque / 252 velocidad
- Naturaleza: Firme / Hurana / Picara
- Habilidad: Potencia Bruta
- Objeto: Panuelo Eleccion
- Stats: PS 351 o menos / Defensa 146 o menos / Ataque 348+ / Velocidad 258+
- Rol: activar el clima y dano inicial
- Moveset: ENVITE IGNIO

CHARIZARD
- Nivel: 100
- IVs: 18+ ataque especial / 16+ velocidad
- EVs: 252 ataque especial / 252 velocidad
- Naturaleza: Modesta / Mansa / Alocada
- Habilidad: cualquiera
- Objeto: Banda Focus
- Stats: Ataque especial 334+ / Velocidad 284+
- Rol: atacante especial bajo el sol
- Moveset: METEOROBOLA

REUNICLUS
- Nivel: 100
- IVs: 0+ PS / 0+ Defensa / 0+ Defensa especial
- EVs: variable segun IVs y naturaleza
- Naturaleza: cualquiera
- Habilidad: Muro Magico
- Objeto: Manto Encubierto
- Stats: PS 361 / Defensa 155-204 / Defensa especial 218
- Rol: activar Espacio Raro y Gravedad
- Moveset: ESPACIO RARO / GRAVEDAD

AMPHAROS
- Nivel: 100
- IVs: 0+ PS / 6+ Defensa / 22+ ataque especial
- EVs: 252 ataque especial / resto variable
- Naturaleza: Modesta / Alocada / Placida
- Habilidad: Mas
- Objeto: Banda Focus
- Stats: PS 290-321 / Defensa 244+ / Ataque especial 352+
- Rol: dano especial
- Moveset: ONDA CERTERA

LUCARIO
- Nivel: 100
- IVs: 22+ ataque especial
- EVs: 252 ataque especial
- Naturaleza: Modesta / Mansa / Alocada / Placida
- Habilidad: cualquiera
- Stats: Ataque especial 352+
- Rol: dano final
- Moveset: ONDA CERTERA

EMPOLEON
- Nivel: 100
- IVs: 1+ PS / 1+ Defensa / 19+ ataque especial
- EVs: 252 ataque especial / resto variable
- Naturaleza: Modesta / Alocada / Placida
- Habilidad: cualquiera
- Stats: PS 311 / Defensa 214 / Ataque especial 339+
- Rol: dano final con Hidrocanyon
- Moveset: HIDROCANYON

== JUGADOR 2 (P:02) ==
Darmanitan y Charizard al inicio, Nidoking y Ampharos en el medio, Kingdra y Empoleon al final.

DARMANITAN
- Nivel: 100
- IVs: 0+ ataque / 0+ velocidad
- EVs: 252 ataque / 252 velocidad
- Naturaleza: Firme / Hurana / Picara
- Habilidad: Potencia Bruta
- Objeto: Panuelo Eleccion
- Stats: PS 351 o menos / Defensa 146 o menos / Ataque 348+ / Velocidad 258+
- Rol: activar el clima y dano inicial
- Moveset: ENVITE IGNIO

CHARIZARD
- Nivel: 100
- IVs: 18+ ataque especial / 16+ velocidad
- EVs: 252 ataque especial / 252 velocidad
- Naturaleza: Modesta / Mansa / Alocada
- Habilidad: cualquiera
- Objeto: Banda Focus
- Stats: Ataque especial 334+ / Velocidad 284+
- Rol: atacante especial bajo el sol
- Moveset: METEOROBOLA

NIDOKING
- Nivel: 100
- IVs: 2+ defensa / 26+ ataque especial / 0+ defensa especial
- EVs: 252 ataque especial / 0 velocidad / resto variable
- Naturaleza: Modesta / Mansa / Placida
- Habilidad: Potencia Bruta
- Objeto: Banda Focus
- Stats: Defensa 146+ / Ataque especial 290+ / Defensa especial 218 / Velocidad 212 o menos
- Rol: dano especial
- Moveset: TIERRA VIVA

AMPHAROS
- Nivel: 100
- IVs: 0+ PS / 0+ defensa / 22+ ataque especial
- EVs: 252 ataque especial / resto variable
- Naturaleza: Modesta / Alocada / Placida
- Habilidad: Mas
- Stats: PS 321+ / Defensa 206 / Ataque especial 352+
- Rol: dano especial
- Moveset: ONDA CERTERA

KINGDRA
- Nivel: 100
- IVs: 0+ PS / 0+ defensa / 25+ ataque especial
- EVs: 252 ataque especial / resto variable
- Naturaleza: Modesta / Alocada / Placida
- Habilidad: cualquiera
- Stats: PS 291 / Defensa 226 / Ataque especial 311+
- Rol: atacante especial bajo Espacio Raro
- Moveset: SALMUERA

EMPOLEON
- Nivel: 100
- IVs: 1+ PS / 1+ defensa / 19+ ataque especial
- EVs: 252 ataque especial / resto variable
- Naturaleza: Modesta / Alocada / Placida
- Habilidad: cualquiera
- Stats: PS 311 / Defensa 214 / Ataque especial 339+
- Rol: dano final
- Moveset: HIDROCANYON

== JUGADOR 3 (P:03) ==
Activa el sol con Ninetales, Whimsicott de apoyo, Ampharos, Lucario y Empoleon.

NINETALES
- Nivel: 100
- IVs: 27+ ataque especial / 16+ velocidad
- EVs: 252 ataque especial / 252 velocidad
- Naturaleza: Modesta / Mansa / Alocada
- Habilidad: Sequia
- Objeto: Banda Focus
- Stats: Ataque especial 282+ / Velocidad 284+
- Rol: activar el sol
- Moveset: METEOROBOLA

CHARIZARD
- Nivel: 100
- IVs: 18+ ataque especial / 0+ velocidad
- EVs: 252 ataque especial / 252 velocidad
- Naturaleza: Modesta / Mansa / Alocada
- Habilidad: cualquiera
- Objeto: Banda Focus
- Stats: Ataque especial 334+ / Velocidad 284+
- Rol: dano especial bajo el sol
- Moveset: METEOROBOLA

WHIMSICOTT
- Nivel: 100
- IVs: 12+ PS / 0+ defensa especial
- EVs: 252 PS / resto variable
- Naturaleza: cualquiera excepto +Defensa especial
- Habilidad: Bromista
- Objeto: Bola Flame
- Stats: PS 305+ / Defensa especial 186
- Rol: quemar a Cobalion y retirar su objeto
- Moveset: TRAPICHEO (movimiento huevo)

AMPHAROS
- Nivel: 100
- IVs: 24+ PS / 24+ defensa / 26+ ataque especial / 25+ defensa especial
- EVs: variable
- Naturaleza: Modesta / Placida
- Habilidad: Mas
- Stats: PS 333+ / Defensa 244+ / Ataque especial 287+ / Defensa especial 273+
- Rol: dano especial y resistencia
- Moveset: ONDA CERTERA

LUCARIO
- Nivel: 100
- IVs: 22+ ataque especial
- EVs: 252 ataque especial
- Naturaleza: Modesta / Mansa / Alocada / Placida
- Habilidad: cualquiera
- Stats: Ataque especial 352+
- Rol: dano final
- Moveset: ONDA CERTERA

EMPOLEON
- Nivel: 100
- IVs: 5+ PS / 19+ ataque especial / 5+ defensa especial
- EVs: 252 ataque especial / resto variable
- Naturaleza: Modesta / Mansa / Alocada
- Habilidad: cualquiera
- Stats: PS 315 / Ataque especial 339+ / Defensa especial 244+
- Rol: dano final
- Moveset: HIDROCANYON

== JUGADOR 4 (P:04) ==
Jirachi elimina el RNG inicial, suman Ampharos, Nidoking, Lucario, Murkrow y Ferrothorn.

JIRACHI
- Nivel: 100
- IVs: 31 PS / 31 defensa / 31 defensa especial / 31 velocidad
- EVs: 252 PS / 36 defensa / 208 velocidad
- Naturaleza: variable
- Habilidad: Dicha
- Stats: PS 404 / Defensa 220 / Defensa especial 236 / Velocidad 316+
- Rol: eliminar RNG y colocar pantallas
- Moveset: REFLEJO / CONJURO / PANTALLA LUZ

AMPHAROS
- Nivel: 100
- IVs: 0+ PS / 0+ defensa / 26+ ataque especial / 0+ defensa especial
- EVs: variable
- Naturaleza: Modesta / Placida / Alocada
- Habilidad: Mas
- Stats: PS 321 / Defensa 238+ / Ataque especial 287+ / Defensa especial 216
- Rol: dano especial y resistencia
- Moveset: ONDA CERTERA

NIDOKING
- Nivel: 100
- IVs: 0+ PS / 26+ ataque especial / 0+ defensa especial
- EVs: 252 PS / 252 ataque especial
- Naturaleza: Modesta / Mansa / Placida
- Habilidad: Potencia Bruta
- Stats: PS 335+ / Ataque especial 290+
- Rol: dano especial
- Moveset: TIERRA VIVA

LUCARIO
- Nivel: 100
- IVs: 22+ ataque especial
- EVs: 252 ataque especial
- Naturaleza: Modesta / Mansa / Alocada / Placida
- Habilidad: cualquiera
- Stats: Ataque especial 352+
- Rol: dano final
- Moveset: ONDA CERTERA

MURKROW
- Nivel: 100
- IVs: 25 o menos PS / 25 o menos defensa especial
- EVs: 0 PS / 0 defensa especial
- Naturaleza: cualquiera excepto +Defensa especial
- Habilidad: Bromista
- Objeto: Baya Charti
- Stats: PS 255 o menos / Defensa especial 114 o menos
- Rol: Ultimo Lugar y atraer los ataques necesarios
- Moveset: ULTIMO LUGAR

FERROTHORN
- Nivel: 100
- IVs: 0+ PS / 0+ defensa
- EVs: variable
- Naturaleza: cualquiera excepto -Defensa
- Habilidad: Punta Acero
- Objeto: Casco Dentado
- Stats: PS 321 / Defensa 330
- Rol: resistir y activar el dano residual final
- Moveset: PROTECCION

CONSEJOS
- Lee la guia completa antes de intentar la raid y conocete la secuencia de todos los turnos.
- Verifica los Pokemon y las builds de tus companeros antes de comenzar.
- Habilidades ocultas clave: Ninetales (Sequia), Nidoking (Potencia Bruta), Ampharos (Mas), Murkrow (Bromista).
- Movimiento huevo clave: Whimsicott (Trapicheo).
$co$,
      array['Raids Legendarias'],
      array['Cobalion', 'Acero', 'Lucha', '0 RNG', 'The Council']
    );
  end if;
end $$;

-- ── VIRIZION ─────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from public.raids where title = 'Virizion: Incursión Legendaria') then
    insert into public.raids (title, excerpt, content, categories, tags)
    values (
      'Virizion: Incursión Legendaria',
      'Estrategia optimizada de Jejgunz para derrotar a Virizion 6 estrellas. Con las builds correctas funciona de forma consistente y requiere coordinacion exacta entre los 4 jugadores.',
      $v$
GUIA #05 - LEGENDARIO
Estrategia optimizada - Jejgunz
Incursion de Virizion 6 estrellas.

TIPO: Planta / Lucha

SECUENCIA DE TURNOS
TURNO 1 (~96.5%):
  J1 - Conjuro Sagrado (Jynx)
  J2 - Reflejo (Jynx)
  J3 - Truco (Jynx)
  J4 - Metralla Helada (Mamoswine)
TURNO 2 (~80%):
  J1 - Ataque Ave (Skarmory)
  J2 - Ataque Ave (Skarmory)
  J3 - Ataque Ave (Skarmory)
  J4 - Ataque Ave (Skarmory)
TURNO 3 (~63.5%):
  J1 - Ataque Ave (Skarmory)
  J2 - Ataque Ave (Skarmory)
  J3 - Ataque Ave (Skarmory)
  J4 - Ataque Ave (Skarmory)
TURNO 4 (~63%):
  J1 - Ataque Ave (Skarmory)
  J2 - Ataque Ave (Skarmory)
  J3 - Respiro (Skarmory)
  J4 - Respiro (Skarmory)
TURNO 5 (~46.5%):
  J1 - Ataque Ave (Staraptor)
  J2 - Ataque Ave (Staraptor)
  J3 - Ataque Ave (Staraptor o Skarmory)
  J4 - Ataque Ave (Staraptor o Skarmory)
TURNO 6 (~46.5%):
  J1 - Sacrificio (Staraptor)
  J2 - Sacrificio (Staraptor)
  J3 - Sacrificio (Staraptor)
  J4 - Sacrificio (Staraptor)
TURNO 7 (~34.5%):
  J1 - Acrobacia (Gliscor)
  J2 - Acrobacia (Gliscor)
  J3 - Acrobacia (Gliscor)
  J4 - Conjuro Sagrado (Jynx)
TURNO 8 (~34.5%):
  J1 - Romperroca (los Gliscor mueren aqui)
  J2 - Romperroca (los Gliscor mueren aqui)
  J3 - Gliscor muere en este turno
  J4 - Truco (Metagross)
TURNO 9 (~32.5%):
  J1 - Romperroca (Metagross + Baya Jaboca)
  J2 - Romperroca (Metagross + Baya Jaboca)
  J3 - Reflejo (Metagross + Baya Jaboca)
  J4 - Golpe Aereo (sin Pokemon especificado)
TURNO 10 (~28.5%):
  J1 - Explosion (Metagross)
  J2 - Explosion (Metagross)
  J3 - Explosion (Metagross)
  J4 - Terremoto (Garchomp)
TURNO 11 (~21%) / TURNO 12 (~12.5%):
  J1-J4 - Cavar (Garchomp) / turno subterraneo
TURNO 13 (~5%) / TURNO 14 (~5%):
  J1-J4 - Cavar (Garchomp) / turno subterraneo
TURNO 15 (0%):
  J1-J4 - Cavar (Garchomp)

EQUIPOS POR JUGADOR

== JUGADOR 1 (P:01) ==
Jynx al inicio, Skarmory, Staraptor y Gliscor, fase final con Metagross y Garchomp.

JYNX (F)
- Nivel: 100
- IVs: 30+ velocidad
- EVs: 252 velocidad
- Naturaleza: Timida / Osada / Ingenua / Alegre
- Habilidad: Insensible
- Objeto: Panuelo Eleccion
- Rol: Conjuro Sagrado
- Moveset: CONJURO SAGRADO

SKARMORY
- Nivel: 100
- IVs: 31 PS / 31 ataque / 31 defensa
- EVs: 220 PS / 36 ataque / 252 defensa
- Naturaleza: Firme / Flematica / Placida
- Habilidad: cualquiera
- Objeto: Baya Iapapa
- Rol: dano con Ataque Ave
- Moveset: ATAQUE AVE

STARAPTOR
- Nivel: 100
- IVs: 31 PS / 31 defensa
- EVs: 252 PS / 252 defensa
- Naturaleza: Firme / Flematica / Placida
- Habilidad: Intimidacion
- Objeto: Baya Figu
- Rol: Ataque Ave y Sacrificio
- Moveset: ATAQUE AVE / SACRIFICIO / RESPIRO

GLISCOR
- Nivel: 100
- IVs: 31 PS / 31 ataque / 31 defensa
- EVs: 252 PS / 36 ataque / 220 defensa
- Naturaleza: Firme / Flematica / Placida
- Habilidad: cualquiera
- Objeto: Gema Aerea
- Rol: dano con Acrobacia y Romperroca
- Moveset: ACROBACIA / ROMPERROCA

METAGROSS
- Nivel: 100
- IVs: 31 PS / 31 ataque / 31 defensa
- EVs: 252 PS / 128 ataque / 128 defensa
- Naturaleza: Firme / Flematica / Placida
- Habilidad: Cuerpo Limpio
- Objeto: Baya Jaboca
- Rol: Romperroca y Explosion
- Moveset: ROMPERROCA / EXPLOSION

GARCHOMP
- Nivel: 100
- IVs: 31 PS / 31 ataque / 31 defensa / 25+ velocidad
- EVs: 252 PS / 4 ataque / 252 defensa
- Naturaleza: Firme / Flematica
- Habilidad: Piel Tosca
- Objeto: Casco Dentado
- Rol: fase final con Cavar
- Moveset: CAVAR

== JUGADOR 2 (P:02) ==
Jynx y Skarmory al inicio, Staraptor y Gliscor, Metagross y Garchomp al final. Misma build de Pokemon que el J1 salvo el objeto del Jynx.

JYNX (F)
- Nivel: 100
- IVs: 30+ velocidad
- EVs: 252 velocidad
- Naturaleza: Timida / Osada / Ingenua / Alegre
- Habilidad: Insensible
- Objeto: Arcilla Ligera (Light Clay)
- Rol: Reflejo
- Moveset: REFLEJO

SKARMORY (idem J1)
- Baya Iapapa / ATAQUE AVE

STARAPTOR (idem J1)
- Baya Figu / Intimidacion / Ataque Ave, Sacrificio, Respiro

GLISCOR (idem J1)
- Gema Aerea / Acrobacia, Romperroca

METAGROSS (idem J1)
- Baya Jaboca / Romperroca, Explosion

GARCHOMP (idem J1)
- Casco Dentado / Cavar

== JUGADOR 3 (P:03) ==
Jynx manipulador, Skarmory y Staraptor, Gliscor y Metagross al final.

JYNX (F)
- Nivel: 100
- IVs: 30+ velocidad
- EVs: 252 velocidad
- Naturaleza: Timida / Osada / Ingenua / Alegre
- Habilidad: Insensible
- Objeto: Llamaesfera
- Rol: Truco
- Moveset: TRUCO

SKARMORY
- Nivel: 100
- IVs: 31 PS / 31 ataque / 31 defensa
- EVs: 240 PS / 36 ataque / 232 defensa
- Naturaleza: Firme / Flematica / Placida
- Habilidad: cualquiera
- Objeto: Baya Iapapa
- Rol: dano y recuperacion
- Moveset: ATAQUE AVE / RESPIRO

STARAPTOR
- Nivel: 100
- IVs: 31 PS / 31 defensa
- EVs: 252 PS / 252 defensa
- Naturaleza: Firme / Flematica / Placida
- Habilidad: Audacia (Reckless)
- Objeto: Baya Figu
- Rol: Ataque Ave y Sacrificio
- Moveset: ATAQUE AVE / SACRIFICIO / RESPIRO

GLISCOR
- Nivel: 100
- IVs: 31 PS / 31 ataque / 31 defensa
- EVs: 252 PS / 36 ataque / 0 defensa
- Naturaleza: Firme / Flematica / Placida
- Habilidad: cualquiera
- Objeto: Gema Aerea
- Rol: dano con Acrobacia
- Moveset: ACROBACIA

METAGROSS
- Nivel: 100
- IVs: 31 PS / 31 ataque / 31 defensa
- EVs: 252 PS / 128 ataque / 128 defensa
- Naturaleza: Firme / Flematica / Placida
- Habilidad: Cuerpo Limpio
- Objeto: Baya Jaboca
- Rol: Reflejo y Explosion
- Moveset: REFLEJO / EXPLOSION

GARCHOMP (idem J1)
- Casco Dentado / Cavar

== JUGADOR 4 (P:04) ==
Mamoswine inicial, Skarmory y Staraptor, Jynx y Metagross, Garchomp final.

MAMOSWINE
- Nivel: 100
- IVs: menos de 16 PS / 31 ataque / menos de 16 defensa
- EVs: 252 ataque / 252 velocidad
- Naturaleza: Audaz / Traviesa / Solitaria
- Habilidad: Insensible
- Objeto: Panuelo Eleccion
- Rol: dano inicial con Metralla Helada
- Moveset: METRALLA HELADA

SKARMORY (idem J3)
- Baya Iapapa / Ataque Ave, Respiro

STARAPTOR
- Nivel: 100
- IVs: 31 PS / 31 defensa
- EVs: 252 PS / 252 defensa
- Naturaleza: Firme / Flematica / Placida
- Habilidad: Audacia (Reckless)
- Objeto: Baya Figu
- Rol: Ataque Ave y Sacrificio
- Moveset: ATAQUE AVE / SACRIFICIO / RESPIRO

JYNX (F)
- Nivel: 100
- IVs: 30+ velocidad
- EVs: 252 velocidad
- Naturaleza: Timida / Osada / Ingenua / Alegre
- Habilidad: Insensible
- Objeto: Banda Focus
- Rol: Conjuro Sagrado
- Moveset: CONJURO SAGRADO

METAGROSS
- Nivel: 100
- IVs: 31 PS / 31 ataque / 31 defensa
- EVs: 252 PS / 4 ataque / 252 defensa
- Naturaleza: Firme / Flematica / Placida
- Habilidad: Cuerpo Limpio
- Objeto: Llamaesfera
- Rol: Truco, Golpe Aereo y Explosion
- Moveset: TRUCO / GOLPE AEREO / EXPLOSION

GARCHOMP
- Nivel: 100
- IVs: 31 PS / 31 ataque / 31 defensa / 25+ velocidad
- EVs: 252 PS / 4 ataque / 252 defensa
- Naturaleza: Firme / Flematica
- Habilidad: Piel Tosca
- Objeto: Casco Dentado
- Rol: Terremoto y Cavar
- Moveset: TERREMOTO / CAVAR

CONSEJOS
- Reinicia hasta conseguir al menos 4 golpes de Metralla Helada.
- Si un Skarmory cae tras realizar su ataque, envia a Staraptor y usa Respiro (turno 5 inestable, pero puede funcionar). REINICIA si cae sin haber atacado.
- Si el Skarmory de P3/P4 sobrevive, usa Respiro; puede reemplazar a un Staraptor del lado derecho y usar Ataque Ave.
- Probabilidad muy baja (~1/256) de que un Staraptor caiga: REINICIA.
- No es necesario conseguir ningun Sacrificio ni Romperroca.
- El Metagross del P4 probablemente caera; usa Golpe Aereo por si acaso.
- La unica forma de perder: un Pokemon adicional usa su ultimo ataque sobre Virizion y activa Justificado, o una cantidad absurda de criticos.
$v$,
      array['Raids Legendarias'],
      array['Virizion', 'Planta', 'Lucha', 'Jejgunz']
    );
  end if;
end $$;

-- ── TERRAKION ────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from public.raids where title = 'Terrakion: Incursión Legendaria') then
    insert into public.raids (title, excerpt, content, categories, tags)
    values (
      'Terrakion: Incursión Legendaria',
      'Estrategia Sword in the Stone para derrotar a Terrakion 6 estrellas. Requiere coordinacion exacta entre los 4 jugadores para completar correctamente cada fase.',
      $t$
GUIA #06 - LEGENDARIO
Estrategia Sword in the Stone
Incursion de Terrakion 6 estrellas.

TIPO: Roca / Lucha

SECUENCIA DE TURNOS
TURNO 1:
  J1 - Reflejo (Gyarados)
  J2 - Truco (Stantler)
  J3 - Supersticion (Exeggutor)
  J4 - Viento Afin (Pelipper)
TURNO 2:
  J1 - Hidrobomba (Suicune)
  J2 - Hidrobomba (Suicune)
  J3 - Gravedad (Exeggutor)
  J4 - Bomba Acida (Tangrowth)
TURNO 3:
  J1 - Hidrobomba (Suicune)
  J2 - Hidrobomba (Suicune)
  J3 - Tormenta Floral (Exeggutor)
  J4 - Hiperplanta (Tangrowth)
TURNO 4:
  J1 - Hidrobomba (Suicune)
  J2 - Espacio Raro (Cofagrigus)
  J3 - Patada Baja (Conkeldurr)
  J4 - Tormenta Floral (Tangrowth)
TURNO 5:
  J1 - Giro Bola (Ferrothorn)
  J2 - Niebla Nocturna (Cofagrigus)
  J3 - Patada Baja (Conkeldurr)
  J4 - Cosquillas (Sableye)
TURNO 6:
  J1 - Giro Bola (Ferrothorn)
  J2 - Fuego Fatuo (Cofagrigus)
  J3 - Patada Baja (Conkeldurr)
  J4 - Anticipo (Sableye)
TURNO 7:
  J1 - Cosquillas (Torterra)
  J2 - Patada Baja (Conkeldurr)
  J3 - Pajaro Osado (Staraptor)
  J4 - Cuchillada Mental (Gallade)
TURNO 8:
  J1 - Cosquillas (Torterra)
  J2 - Patada Baja (Conkeldurr)
  J3 - Terremoto (Excadrill)
  J4 - Terremoto (Excadrill)
TURNO 9:
  J1 - Martillo Madera (Torterra)
  J2 - Patada Baja (Conkeldurr)
  J3 - Patada Baja (Medicham)
  J4 - Viento Afin (Crobat)
TURNO 10:
  J1 - Cuchillada Mental (Gallade)
  J2 - Terremoto (Excadrill)
  J3 - Psicoonda (Alakazam)
  J4 - (sin accion)
TURNO 11 (0%):
  J1 - Terremoto (Excadrill)
  J2 - Psicoonda (Alakazam)
  J3 - (sin accion)
  J4 - (sin accion)

EQUIPOS POR JUGADOR

== JUGADOR 1 (P:01) ==
Gyarados con Reflejo al inicio, Suicune, Ferrothorn y Torterra, fase final con Gallade y Excadrill.

GYARADOS
- Nivel: 100
- IVs: 31 PS / 31 defensa
- EVs: 252 PS / 252 defensa / 6 velocidad
- Naturaleza: Firme
- Habilidad: Intimidacion
- Objeto: Arcilla Ligera
- Rol: Reflejo
- Moveset: REFLEJO

SUICUNE
- Nivel: 100
- IVs: 31 PS / 31 defensa / 31 ataque especial / 0 velocidad
- EVs: 6 PS / 212 defensa / 252 ataque especial / 4 velocidad
- Naturaleza: Calmada (Relaxed)
- Habilidad: Presion
- Objeto: Gafas Elegidas
- Rol: dano con Hidrobomba
- Moveset: HIDROBOMBA

FERROTHORN
- Nivel: 100
- IVs: 31 PS / 31 ataque / 31 defensa / 0 velocidad
- EVs: 172 PS / 86 ataque / 252 defensa
- Naturaleza: Calmada (Relaxed)
- Habilidad: Punta Acero
- Objeto: Cinta Elegida
- Rol: dano con Giro Bola
- Moveset: GIRO BOLA

TORTERRA
- Nivel: 100
- IVs: 31 PS / 31 ataque / 31 defensa / 31 velocidad
- EVs: 152 PS / 252 defensa / 40 velocidad
- Naturaleza: Audaz
- Habilidad: Caparazon
- Objeto: Baya Jaboca
- Rol: Cosquillas y dano con Martillo Madera
- Moveset: COSQUILLAS (movimiento huevo) / MARTILLO MADERA

GALLADE (M)
- Nivel: 100
- IVs: 31 ataque / 31 velocidad
- EVs: 252 ataque / 252 velocidad
- Naturaleza: Audaz / Traviesa
- Habilidad: Filo Cortante (Sharpness)
- Objeto: Gema Psiquica
- Rol: dano con Cuchillada Mental
- Moveset: CUCHILLADA MENTAL

EXCADRILL
- Nivel: 100
- IVs: 31 ataque / 31 velocidad
- EVs: 6 PS / 252 ataque / 252 velocidad
- Naturaleza: Audaz
- Habilidad: Fuerza Arena (Sand Force)
- Objeto: Gema Tierra
- Rol: dano con Terremoto
- Moveset: TERREMOTO

== JUGADOR 2 (P:02) ==
Stantler con Truco al inicio, Suicune, Cofagrigus y Conkeldurr, termina con Excadrill y Alakazam.

STANTLER
- Nivel: 100
- IVs: malas (6x0 preferido)
- EVs: -
- Naturaleza: cualquiera
- Habilidad: Intimidacion
- Objeto: Llamaesfera
- Rol: Truco
- Moveset: TRUCO

SUICUNE
- Nivel: 100
- IVs: 0 PS / 31 defensa / 31 ataque especial / 0 velocidad
- EVs: 88 defensa / 252 ataque especial / 8 velocidad
- Naturaleza: Mansa (Quiet)
- Habilidad: Presion
- Objeto: Baya Jaboca
- Rol: dano con Hidrobomba
- Moveset: HIDROBOMBA

COFAGRIGUS
- Nivel: 100
- IVs: 31 PS / 31 defensa
- EVs: 252 PS / 252 defensa
- Naturaleza: Calmada (Relaxed)
- Habilidad: Momia
- Objeto: Gafas Protectoras
- Rol: Espacio Raro, Niebla Nocturna y Fuego Fatuo
- Moveset: ESPACIO RARO / NIEBLA NOCTURNA / FUEGO FATUO

CONKELDURR
- Nivel: 100
- IVs: 31 PS / 31 ataque / 31 defensa / 31 velocidad
- EVs: 134 PS / 244 defensa / 132 velocidad
- Naturaleza: Audaz
- Habilidad: Agallas
- Objeto: Baya Figu
- Rol: dano con Patada Baja
- Moveset: PATADA BAJA

EXCADRILL
- Nivel: 100
- IVs: 31 ataque / 31 velocidad
- EVs: 6 PS / 252 ataque / 252 velocidad
- Naturaleza: Audaz
- Habilidad: Fuerza Arena
- Objeto: Cinta Elegida
- Rol: dano con Terremoto
- Moveset: TERREMOTO

ALAKAZAM
- Nivel: 100
- IVs: 31 ataque especial / 31 velocidad
- EVs: 6 PS / 252 defensa / 252 ataque especial
- Naturaleza: Modesta
- Habilidad: Concentracion Plena
- Objeto: Casco Dentado
- Rol: dano con Psicoonda
- Moveset: PSICOONDA

== JUGADOR 3 (P:03) ==
Exeggutor prepara el terreno (Supersticion, Gravedad), Conkeldurr y Staraptor, termina con Excadrill, Medicham y Alakazam.

EXEGGUTOR
- Nivel: 100
- IVs: 31 PS / 31 defensa / 31 ataque especial / 31 velocidad
- EVs: 68 defensa / 252 ataque especial / 112 velocidad
- Naturaleza: Timida
- Habilidad: Clorofila
- Objeto: Casco Dentado
- Rol: Supersticion, Gravedad y Tormenta Floral
- Moveset: SUPERSTICION (movimiento huevo) / GRAVEDAD / TORMENTA FLORAL

CONKELDURR
- Nivel: 100
- IVs: 31 PS / 31 ataque / 31 defensa
- EVs: 100 PS / 158 ataque / 252 defensa
- Naturaleza: Audaz
- Habilidad: Agallas
- Objeto: Cinta Elegida
- Rol: dano con Patada Baja
- Moveset: PATADA BAJA

STARAPTOR
- Nivel: 100
- IVs: 31 ataque
- EVs: 252 ataque
- Naturaleza: Audaz
- Habilidad: Audacia (Reckless)
- Objeto: Gema Voladora
- Rol: dano con Pajaro Osado
- Moveset: PAJARO OSADO

EXCADRILL
- Nivel: 100
- IVs: 31 ataque
- EVs: 252 ataque / 252 velocidad
- Naturaleza: Audaz
- Habilidad: Fuerza Arena
- Objeto: Gema Tierra
- Rol: dano con Terremoto
- Moveset: TERREMOTO

MEDICHAM
- Nivel: 100
- IVs: 31 ataque
- EVs: 252 ataque / 252 velocidad
- Naturaleza: Audaz
- Habilidad: Energia Pura
- Objeto: Gema Lucha
- Rol: dano con Patada Baja
- Moveset: PATADA BAJA

ALAKAZAM
- Nivel: 100
- IVs: 31 ataque especial / 31 velocidad
- EVs: 6 PS / 252 defensa / 252 ataque especial
- Naturaleza: Modesta
- Habilidad: Concentracion Plena
- Objeto: Baya Jaboca
- Rol: dano con Psicoonda
- Moveset: PSICOONDA

== JUGADOR 4 (P:04) ==
Pelipper con Viento Afin al inicio, Tangrowth y Sableye, Gallade, Excadrill y Crobat al final.

PELIPPER
- Nivel: 100
- IVs: 13+ velocidad
- EVs: 252 velocidad
- Naturaleza: Debe ser Hardy (Hardy)
- Habilidad: Llovizna
- Objeto: Panuelo Elegido
- Rol: Viento Afin
- Moveset: VIENTO AFIN

TANGROWTH
- Nivel: 100
- IVs: 31 PS / 31 defensa / 31 ataque especial / 31 velocidad
- EVs: 132 PS / 28 defensa / 252 ataque especial / 98 velocidad
- Naturaleza: Modesta
- Habilidad: Clorofila
- Objeto: Semilla Milagro
- Rol: Bomba Acida, Hiperplanta y Tormenta Floral
- Moveset: BOMBA ACIDA / HIPERPLANTA / TORMENTA FLORAL

SABLEYE
- Nivel: 100
- IVs: 31 PS / 31 defensa
- EVs: 252 PS / 252 defensa
- Naturaleza: Firme
- Habilidad: Bromista
- Objeto: Baya Jaboca
- Rol: Cosquillas y Anticipo
- Moveset: COSQUILLAS / ANTICIPO

GALLADE (M)
- Nivel: 100
- IVs: 31 ataque / 31 velocidad
- EVs: 252 ataque / 252 velocidad
- Naturaleza: Audaz
- Habilidad: Filo Cortante (Sharpness)
- Objeto: Cinta Elegida
- Rol: dano con Cuchillada Mental
- Moveset: CUCHILLADA MENTAL

EXCADRILL
- Nivel: 100
- IVs: 31 ataque / 31 velocidad
- EVs: 252 ataque / 252 velocidad
- Naturaleza: Audaz
- Habilidad: Fuerza Arena
- Objeto: Gema Tierra
- Rol: dano con Terremoto
- Moveset: TERREMOTO

CROBAT
- Nivel: 100
- IVs: 31 PS / 31 defensa / 31 velocidad
- EVs: 252 PS / 252 defensa
- Naturaleza: Alegre
- Habilidad: Concentracion Plena
- Objeto: Casco Dentado
- Rol: Viento Afin
- Moveset: VIENTO AFIN

CONSEJOS
- REINICIA si el turno de Anticipo no coincide con la activacion de Ataque Furia: deberias recibir la notificacion de Ataque Furia en el turno 5; comprueba las estadisticas de tus Pokemon.
- Respeta el orden de acciones de cada turno.
- Las acciones de los 4 jugadores son necesarias para mantener la secuencia.
$t$,
      array['Raids Legendarias'],
      array['Terrakion', 'Roca', 'Lucha', 'Sword in the Stone']
    );
  end if;
end $$;