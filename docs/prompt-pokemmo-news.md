# Prompt: Sección de Noticias de PokeMMO para Página Web del Clan

---

## Contexto

Necesito crear una sección de noticias de PokeMMO en la página web de mi clan. PokeMMO **NO tiene API pública**, pero su foro oficial (Invision Community) tiene **un RSS feed público funcionando** que contiene changelogs, updates y anuncios de staff.

**Stack actual:** HTML/CSS/JS vanilla + Supabase (ya configurado)

---

## RSS Feed Disponible (CONFIRMADO FUNCIONANDO)

```
https://forums.pokemmo.com/index.php?/rss/1-updates-announcements.xml/
```

### Estructura del RSS (XML)
```xml
<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Updates &amp; Announcements</title>
    <item>
      <title>Changelog: Shiny Wars 2026</title>
      <link>https://forums.pokemmo.com/index.php?/topic/199536-changelog-shiny-wars-2026/&amp;do=findComment&amp;comment=2239504</link>
      <description>Cambios del juego: Client Display, Performance, etc.</description>
      <enclosure url="https://forums.pokemmo.com/uploads/..." length="27502" type="image/gif"/>
      <pubDate>Fri, 14 Aug 2026 00:07:38 +0000</pubDate>
    </item>
    <!-- Más items... -->
  </channel>
</rss>
```

### Campos de cada item:
- `title` - Título del changelog/anuncio
- `link` - URL directa al post del foro
- `description` - Resumen/descripción del contenido
- `enclosure` (opcional) - Imagen adjunta
- `pubDate` - Fecha de publicación

---

## Lo que necesito construir

### 1. Supabase Edge Function (proxy RSS)

Crear una Edge Function en Supabase que:

- Haga `fetch` al RSS feed de PokeMMO
- Parsee el XML y extraiga los items
- Guarde/actualice los datos en una tabla de Supabase llamada `pokemmo_news`
- Se ejecute periódicamente (cada 30-60 minutos) usando pg_cron o un cron externo

**Edge Function (Deno/TypeScript):**
```typescript
// supabase/functions/fetch-pokemmo-news/index.ts
// Usa fetch() nativo de Deno para obtener el RSS
// Parsea el XML manualmente o con una librería ligera
// Inserta/upsert en la tabla pokemmo_news
```

### 2. Tabla en Supabase

```sql
CREATE TABLE pokemmo_news (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  link TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para ordenar por fecha
CREATE INDEX idx_pokemmo_news_published ON pokemmo_news(published_at DESC);

-- RLS: lectura pública, escritura solo service_role
ALTER TABLE pokemmo_news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON pokemmo_news
  FOR SELECT USING (true);

CREATE POLICY "Service role insert" ON pokemmo_news
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role update" ON pokemmo_news
  FOR UPDATE USING (true);
```

### 3. Cron Job para auto-actualización

Opción A - pg_cron (recomendado, dentro de Supabase):
```sql
-- Instalar extensión pg_cron si no está
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Ejecutar la función cada 30 minutos
SELECT cron.schedule(
  'fetch-pokemmo-news',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://TU-Proyecto.supabase.co/functions/v1/fetch-pokemmo-news',
    headers := jsonb_build_object(
      'Authorization', 'Bearer TU_SERVICE_ROLE_KEY'
    )
  );
  $$
);
```

Opción B - Supabase Dashboard: Configurar cron en Dashboard > Edge Functions > Schedules

### 4. Frontend (HTML/CSS/JS vanilla)

```html
<!-- Sección de noticias en la página del clan -->
<section id="pokemmo-news">
  <h2>Noticias PokeMMO</h2>
  <div id="news-container">
    <!-- Se llena dinámicamente -->
  </div>
</section>
```

```javascript
// news.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('TU_URL', 'TU_ANON_KEY');

async function loadNews() {
  const { data, error } = await supabase
    .from('pokemmo_news')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error loading news:', error);
    return;
  }

  const container = document.getElementById('news-container');
  container.innerHTML = data.map(news => `
    <article class="news-card">
      ${news.image_url ? `<img src="${news.image_url}" alt="${news.title}" class="news-image"/>` : ''}
      <h3><a href="${news.link}" target="_blank" rel="noopener">${news.title}</a></h3>
      <time datetime="${news.published_at}">${new Date(news.published_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
      <p>${news.description ? news.description.substring(0, 200) + '...' : ''}</p>
      <a href="${news.link}" target="_blank" rel="noopener" class="news-read-more">Leer más →</a>
    </article>
  `).join('');
}

// Cargar noticias al iniciar
loadNews();
// Actualizar cada 5 minutos en el cliente
setInterval(loadNews, 5 * 60 * 1000);
```

### 5. CSS (ejemplo base)

```css
.news-card {
  border: 1px solid #333;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  background: #1a1a2e;
  transition: transform 0.2s;
}

.news-card:hover {
  transform: translateY(-2px);
  border-color: #e2b714;
}

.news-card h3 a {
  color: #e2b714;
  text-decoration: none;
}

.news-card h3 a:hover {
  text-decoration: underline;
}

.news-image {
  width: 100%;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.news-card time {
  color: #888;
  font-size: 0.85rem;
  display: block;
  margin-bottom: 0.5rem;
}

.news-card p {
  color: #ccc;
  line-height: 1.5;
}

.news-read-more {
  color: #e2b714;
  font-weight: bold;
  text-decoration: none;
  display: inline-block;
  margin-top: 0.5rem;
}

.news-read-more:hover {
  text-decoration: underline;
}
```

---

## Notas importantes

1. **Solo hay 1 RSS feed disponible** de PokeMMO (Updates & Announcements combinado). No hay RSS para secciones individuales como "Competition Alley".

2. **Los cambios de tier competitivo** SÍ aparecen dentro de los changelogs de este feed (ej: "Minor adjustments to encounter tables", "Bug Fixes", etc.). No necesitas un feed adicional.

3. **El RSS se actualiza** cuando los staff publican changelogs o anuncios oficiales (no es muy frecuente, ~1-3 veces al mes).

4. **CORS:** El RSS feed no tiene headers CORS, por eso necesitas la Edge Function como proxy. No se puede hacer fetch directo desde el navegador.

5. **Parsing XML:** Deno no tiene parser XML nativo. Puedes usar una regex simple o instalar un paquete ligero como `https://deno.land/x/xml@2.0.0/mod.ts`.

6. **Rate limiting:** PokeMMO podría bloquear requests frecuentes. Usa intervalos de 30+ minutos para el cron. El feed cambia muy pocas veces al mes.

---

## Pasos de implementación

1. Crear la tabla `pokemmo_news` en Supabase (SQL Editor)
2. Crear la Edge Function `fetch-pokemmo-news` (Supabase CLI o Dashboard)
3. Configurar el cron schedule
4. Ejecutar la Edge Function una primera vez para poblar datos
5. Integrar el frontend en la página HTML del clan
6. Estilizar con CSS para que combine con el diseño del clan
