# Ideas del portal SpFc/Gd — informe

> Informe vivo: se va ampliando con las nuevas ideas a medida que se deciden.
> Todo se prueba primero en servidor local (`npm run dev`) antes de subir a GitHub.

---

## En planificación

### 1. Sección Cumpleaños
- Nadie la modifica manualmente: se autogenera desde la fecha de nacimiento de cada perfil.
- Requiere añadir `birth_date` al perfil + campo en la pestaña de edición.
- Vista: calendario mes a mes **hasta el 2050 como mínimo**; cada miembro aparece en su día cada año.
- Extra sugerido: aviso "🎂 Hoy cumple X" en el Inicio + recordatorio.

### 2. Confirmar asistencia (RSVP) a eventos
- Botón **Asistiré / No iré** en cada evento publicado.
- Lista de inscritos visible junto/debajo del casillero de comentarios.

### 3. Cuadro de llaves (brackets) de torneo
- Integrado en la web (sin depender de Challonge).
- Llaves generadas **aleatoriamente**; opción de partido por 3.er y 4.º puesto.
- El botón **"Participaré"** agrega al participante a una lista.
- Interfaz **editable hasta crear las llaves**: permite añadir inscritos durante el evento.
- Campos del torneo: nombre, lugar, hora del evento, Host (moderador), tier del torneo, modo de combate (BO1 / BO3 / BO7).
- Investigar el funcionamiento de Challonge para modelar la lógica de llaves.

### 4. Final del torneo + historial
- Al terminar, mostrar los 3 primeros ganadores y guardarlos en la sección Torneos (estilo sorteo de tickets).
- Estado del torneo → **"finalizado"** automáticamente.
- Interfaz superpuesta de historial de torneos: datos del torneo, llaves y ganadores al final del informe.

---

## Nuevas sugerencias (a valorar)

### 5. Sistema de Gyms con medallas
- Atado al sistema de rangos: en las reglas dice *"Ser líder de Gym sube instantáneamente a Superior"*.
- Cada líder de gym defiende un tipo/temática; los miembros retan y ganan **medallas** que se muestran en su perfil.

### 6. Ladder PvP interno con Elo
- Ranking interno por puntos Elo: retos, reporte de combates y validación mutua.
- Le da cuerpo al requisito de PvP de los rangos Experto/Elite.

### 7. Misiones / retos semanales del clan
- Tareas con plazo (capturar X, ganar Y duelos, reportar un shiny) con revisión y recompensa.
- Mantiene la actividad constante entre eventos.

### 8. Tablero de intercambios (WTS / WTB)
- Publicar "vendo / compro" de Pokémon e ítems; con comentarios y estado (vendido).
- Muy común en PokeMMO y genera tráfico diario.

### 9. Equipos compartidos (teampaste)
- Pegar el texto de un equipo de PokeMMO en el perfil o en las guías, con botón copiar.
- Útil para guías de PvP y para revisar builds.

### 10. Canal de chat general del clan
- Reutiliza el Realtime ya implementado: chat general en vivo con historial.
- Alternativa: canales por sección/equipo.

### 11. Puntos de actividad / economía del clan
- Puntos por participar en eventos, ganar torneos o reportar shinies; con ranking mensual.
- Da recompensas medibles dentro del clan.

### 12. Recordatorios automáticos
- Push/notificación antes de un evento (1 h, 10 min) y el día de un cumpleaños.

---

## Nuevas ideas (Raymon, 2.ª tanda)

### 13. Almacén de Builds (teampaste)
- Subsecciones por **tier**: Over Used (OU), Under Used (UU), Never Used (NU), Doubles VGC, Little Cup (LC) y Monotype.
- Cualquier miembro puede publicar su build. Campos:
  - Nombre del creador o de quien la comparte.
  - Enlace/Link del paste.
  - Imagen (por si la build es imagen en lugar de enlace).
  - Guardar.
- Cada build publicada es una **publicación abrible**: comentar, dar like y compartir (tanto dentro de la publicación como desde la vista exterior).
- Reutiliza la infraestructura de likes/comentarios/compartir existente → ampliar `parent_type` de la tabla `likes` con `'build'`.

### 14. Comercio / Intercambios
- Pueden publicar **todos** los miembros. Formulario:
  - Quién ofrece el servicio (nombre).
  - Tipo de servicio: Venta / Entrenamiento de Pokémon / Crianza / Compra o búsqueda / Otra.
  - Adjuntar imágenes o documentos.
  - Botón Guardar.
- Misma interacción que las builds: **like, compartir y comentar** en cada publicación.
- La sección se divide en **dos**:
  - **Ofertas**: todas las ofertas publicadas por el clan + quién la publicó (con acceso a su perfil).
  - **Mis Ofertas**: agregar, modificar y eliminar ofertas propias, con actualización en tiempo real.
- Solo **superadmins y admins** pueden eliminar ofertas de otros miembros (garantizar el cumplimiento de las normas).
- Ampliar `parent_type` de `likes` con `'trade'`.

---

## Hoja de ruta (DLC)

| DLC | Sección | Estado |
|-----|---------|--------|
| DLC 6 | Cumpleaños (perfil `birth_date` + calendario hasta 2050) | ✔ Construido (local) |
| DLC 7 | RSVP / Confirmar asistencia a eventos | ✔ Construido (local) |
| DLC 8 | Brackets de torneo + historial y ganadores | ✔ Construido (local) |
| DLC 9 | Almacén de Builds | ✔ Construido (local) |
| DLC 10 | Comercio (Ofertas + Mis Ofertas) | ✔ Construido (local) |

> **Siguiente paso:** ejecutar en Supabase SQL Editor los SQLs `dlc6_cumpleanos.sql`, `dlc7_rsvp.sql`, `dlc9_builds.sql`, `dlc10_comercio.sql` y `dlc8_brackets.sql` (en ese orden; `dlc9` ya amplía los checks de `likes`/`comments` para `build` y `trade`). Probar en local con `npm run dev` y, cuando todo funcione, subir a GitHub y desplegar.

