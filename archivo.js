// Entrega un PDF solo si hay sesión iniciada (el navegador nunca ve la dirección real en Blob).
import { q } from '../lib/db.js';
import { exigirLogin, json } from '../lib/auth.js';

export default async function handler(req, res) {
  if (!(await exigirLogin(req, res))) return;
  try {
    const id = parseInt(req.query?.id);
    const [d] = id ? await q('SELECT no_oficio, archivo_pdf FROM documentos WHERE id_documento = $1', [id]) : [];
    if (!d?.archivo_pdf) return json(res, 404, { error: 'No encontrado' });
    const r = await fetch(d.archivo_pdf);
    if (!r.ok) return json(res, 404, { error: 'No encontrado' });
    const buf = Buffer.from(await r.arrayBuffer());
    const nombre = 'oficio-' + d.no_oficio.replace(/[^\w.-]+/g, '_') + '.pdf';
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', buf.length);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Disposition', `${req.query.dl ? 'attachment' : 'inline'}; filename="${nombre}"`);
    res.end(buf);
  } catch (e) {
    json(res, 500, { error: 'Error del servidor: ' + e.message });
  }
}
