# Portal Oficial del Clan PokeMMO — SpFc/Gd

> 🌐 **Web en producción:** [https://technosoft-solutions35.github.io/spfc-portal/](https://technosoft-solutions35.github.io/spfc-portal/)

SPA moderna, responsiva y de alto rendimiento para el clan **Special Force/Gd (SpFc/Gd)**.
Construida con **React + Vite + Tailwind CSS + Supabase** (Auth, PostgreSQL, RLS y Realtime).

## Stack

| Capa      | Tecnología                                                            |
| --------- | --------------------------------------------------------------------- |
| Frontend  | React 18 · Vite · Tailwind CSS · Framer Motion · Lucide · Confetti    |
| Backend   | Supabase (Auth + PostgreSQL + Row Level Security + Realtime + Storage) |
| Deploy    | Cualquier hosting estático (Vercel, Netlify, Cloudflare Pages, ...)   |

## Estructura del proyecto

```
spfc-portal/
├─ public/images/            # logo-clan.png, background.png (imágenes reales del clan)
├─ supabase/schema.sql       # Esquema completo: tablas, RLS, triggers, storage
├─ supabase/seed-super-admin.sql  # Crea el usuario super-admin del fundador (ya validado)
├─ src/
│  ├─ components/
│  │  ├─ layout/             # Sidebar, menú móvil, fondo, layout principal
│  │  ├─ ui/                 # Modal, Toast, Spinner, Avatar, CommentSection, ...
│  │  ├─ management/         # CRUD genérico de contenido + gestión de roles
│  │  └─ RaffleDraw/         # Revelado de ganadores con confetti
│  ├─ context/               # AuthContext (sesión + rol) y ThemeContext
│  ├─ hooks/                 # useCrud (CRUD genérico contra Supabase)
│  ├─ lib/                   # Cliente supabase, utilidades, navegación
│  └─ pages/                 # Login, Registro, Verificar, Dashboard, ShinyHunt, ...
└─ .env.example              # Variables de entorno
```

## Puesta en marcha

### 1) Instalar y arrancar

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # build de producción en /dist
```

### 2) Crear el proyecto en Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com) (región cercana a tu comunidad).
2. Ve a **SQL Editor → New query**, pega el contenido de `supabase/schema.sql` y ejecútalo.
   Esto crea: `profiles`, `news`, `events`, `tournaments`, `guides`, `comments`,
   `tickets`, `draws`, todas las políticas RLS, el trigger que crea el perfil
   al registrarse, el bucket `media` y el Realtime de las tablas clave.

3. Copia `.env.example` a `.env` y pega tus credenciales:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU-CLAVE-ANON-PUBLICA
```

> Las claves están en **Supabase → Project Settings → API**. La anon key es pública
> y es segura porque todo el acceso se controla con RLS.

### 3) Configurar el correo (verificación y recuperación)

En **Supabase → Authentication → Providers → Email**, activa **Confirm email**
(requerido para el flujo de verificación por código).

#### Código de verificación de 6 dígitos

1. Ve a **Authentication → Email Templates → Confirm signup** y añade `{{ .Token }}`
   en el cuerpo del correo para que se muestre el **código de 6 dígitos** que el
   usuario introduce en la pantalla `/verificar`.
2. También es recomendable editar la plantilla **Magic Link / OTP** para que incluya
   `{{ .Token }}`; así el botón "Reenviar código" entrega el código numérico.

> La pantalla de verificación admite **dos vías**: el código de 6 dígitos (recomendado)
> o el enlace de confirmación de Supabase (si el usuario pulsa el enlace del correo,
> la app lo detecta automáticamente con el `token_hash`).

#### Recuperación de contraseña

La plantilla **Recovery** ya funciona por enlace: el usuario recibe un enlace que abre
`#/restablecer`, donde introduce la nueva contraseña.

> Recomendación: usa SMTP real (Gmail/Resend) en **Project Settings → Auth → SMTP**
> para mejor entregabilidad. Sin SMTP, Supabase usa su correo de demostración
> (límite ~2-3 emails/hora).

### 4) Primer super-admin (tu cuenta)

Todos los usuarios se registran con rol `member`. Tu cuenta de fundador ya está
preparada: ejecuta `supabase/seed-super-admin.sql` en el SQL Editor. Crea el
usuario **ProfesorRaymonGX** con tu correo `crawfordpokemmo@gmail.com`, contraseña
`Raymon@2003` (cifrada con bcrypt), **email ya verificado** y rol `super-admin`.

> 🔑 **Login**: la pantalla de acceso pide **usuario + contraseña** (no el correo).
> El registro pide usuario, correo y contraseña.

Desde **Gestión → Miembros y roles** (solo super-admin puede otorgar/cambiar roles)
podrás ascender a administradores y gestores del clan.

## Roles y permisos

| Acción                                              | member | gestor | admin | super-admin |
| --------------------------------------------------- | :----: | :----: | :---: | :---------: |
| Ver todas las secciones                             |   ✅   |   ✅   |  ✅   |     ✅      |
| Publicar/editar/eliminar **noticias**               |   ❌   |   ✅   |  ✅   |     ✅      |
| CRUD de eventos, torneos y guías                    |   ❌   |   ❌   |  ✅   |     ✅      |
| Corregir contadores de Shiny Hunt (+ / -)           |   ❌   |   ✅   |  ✅   |     ✅      |
| Panel de **sorteos** (carga + ejecución)            |   ❌   |   ❌   |  ✅   |     ✅      |
| Comentar/inscribirse y **editar sus** comentarios   |   ✅   |   ✅   |  ✅   |     ✅      |
| **Otorgar / cambiar roles** a los usuarios          |   ❌   |   ❌   |  ❌   |     ✅      |

## Módulos

- **Shiny Hunt**: tabla en tiempo real (Supabase Realtime), ordenada de mayor a menor.
  Los staff corrigen conteos al instante con + / -.
- **Sorteos**: carga masiva de tickets (formato `Nombre Cantidad`), visualización
  ordenada y sorteo **ponderado** (cada ticket es una boleta virtual en la urna).
  Genera **3 ganadores distintos** con animación de celebración y confetti.
- **Torneos / Eventos**: tarjetas con inscripciones por comentarios.
- **Guías y Buildeos**: artículos con etiquetas.
- **Dashboard**: banner de la última noticia + widgets de torneos, eventos y Top 3 shiny.
- **Tema claro/oscuro**: botón flotante, preferencias independientes y persistidas.

## Notas de seguridad

- Toda la lógica de autorización se aplica en la base de datos (RLS); el frontend solo
  oculta o muestra acciones según el rol, nunca confía en sí mismo.
- Las funciones `is_super_admin()` / `is_admin()` / `is_staff()` son `SECURITY DEFINER`
  y no permiten escalada: un usuario jamás puede auto-asignarse rol. Además, un
  **trigger** (`prevent_role_change`) bloquea cualquier cambio de la columna `role`
  que no provenga del super-admin.
- `get_login_email(username)` expone únicamente el correo asociado a un nombre de
  usuario para permitir el login con usuario; no revela contraseñas ni datos extra.
- Para operaciones administrativas de emergencia (p. ej. resetear a un admin) usa el
  dashboard de Supabase, que actúa fuera del alcance de RLS.

## Comandos útiles

```bash
npm run dev      # desarrollo
npm run build    # producción (dist/)
npm run preview  # previsualizar el build
```
