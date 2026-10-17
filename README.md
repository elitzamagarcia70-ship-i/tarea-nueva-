# Gestión de Documentos · UNACH ETDA (versión Vercel)

Misma plataforma que la versión PHP (registro, digitalización a PDF, búsqueda, visor, reportes, login),
adaptada para correr en **Vercel**: HTML + jQuery en `public/`, funciones Node en `api/`,
**Postgres (Neon)** en lugar de MySQL y **Vercel Blob** en lugar de la carpeta `uploads/`.

## Qué cambió respecto a PHP
| Antes (PHP) | Ahora (Vercel) |
|---|---|
| `index.php`, `reportes.php`, `login.php` | `public/index.html`, `reportes.html`, `login.html` |
| `api.php` | `api/documentos.js`, `api/reportes.js`, `api/export.js` |
| `auth.php` (sesión PHP) y `logout.php` | `lib/auth.js` (cookie firmada JWT), `api/login.js`, `api/logout.js`, `api/me.js` |
| `archivo.php` y carpeta `uploads/` | `api/subir.js`, `api/archivo.js` y Vercel Blob |
| MySQL (`config.php`, `database.sql`) | Postgres de Neon (`lib/db.js`, `schema.sql`) |

Los PDF se siguen entregando solo con sesión iniciada. Límite por PDF: **4 MB** (las funciones de Vercel aceptan 4.5 MB por petición).

## Despliegue paso a paso
1. Sube esta carpeta a un repositorio de GitHub.
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repositorio → **Deploy** (la primera vez fallará al usar la base; es normal).
3. En el proyecto, pestaña **Storage**:
   - **Create Database → Neon (Postgres)** y conéctala al proyecto. Vercel agrega `DATABASE_URL`.
   - **Create Database → Blob** (store **Public**) y conéctalo. Vercel agrega `BLOB_READ_WRITE_TOKEN`.
4. En **Settings → Environment Variables** agrega `JWT_SECRET` con una cadena larga y aleatoria (mínimo 16 caracteres).
5. En **Deployments** → los tres puntos del último → **Redeploy**.
6. Abre la dirección del proyecto e inicia sesión con **admin / admin123** (las tablas y el usuario se crean solos). Cambia esa contraseña.
7. Opcional: para cargar los 20 oficios de prueba, copia `schema.sql` en el **SQL Editor** de Neon y ejecútalo.

## Probar en tu computadora
```bash
npm install
npm i -g vercel
vercel link
vercel env pull .env.local     # baja DATABASE_URL, BLOB_READ_WRITE_TOKEN y JWT_SECRET
vercel dev                     # abre http://localhost:3000
```

## Notas
- Los PDF viven en Blob con nombre aleatorio y el navegador nunca ve su dirección real: se piden por `/api/archivo?id=...`, que exige sesión.
- Los PDF de la carpeta `uploads/` de la versión PHP no se migran (estaban ligados a la base MySQL local). Los documentos nuevos se suben desde la plataforma.
- Si necesitas PDF de más de 4 MB, hay que cambiar la subida a "client upload" de `@vercel/blob`.
