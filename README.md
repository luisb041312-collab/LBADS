# Luis Barrios — Landing page

Sitio web de marca personal de **Luis Barrios**, especialista en adquisición de clientes con Meta Ads (Facebook e Instagram).

Página estática (HTML + CSS + JavaScript, sin dependencias ni build). Se puede abrir directamente en el navegador o subir a cualquier hosting.

## Estructura

- `index.html` — página principal (hero, resultados, servicios, proceso, FAQ, CTA).
- `aplicar.html` — formulario de aplicación tipo funnel que termina en Calendly.
- `styles.css` — estilos.
- `main.js` / `funnel.js` — comportamiento y animaciones.
- `lib/` — GSAP + ScrollTrigger (animaciones) y `manifest.js` (datos de marca).
- `assets/img/` — imágenes optimizadas (WebP).
- `assets/photos/source/` — imágenes originales.
- `.htaccess` — cabeceras de caché para Apache/Hostinger.

## Configuración

El enlace de Calendly y el correo se editan en `lib/manifest.js`.

## Publicar

**Hostinger:** subir todo el contenido de la carpeta a `public_html` (incluido el archivo oculto `.htaccess`).

**GitHub Pages:** en Settings → Pages, elegir la rama `main` y carpeta raíz (`/`).

También funciona en Netlify, Vercel o cualquier hosting estático arrastrando la carpeta.
