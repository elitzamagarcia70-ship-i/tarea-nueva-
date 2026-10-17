// Reportes: totales por estatus, por mes y los más frecuentes
import { q } from '../lib/db.js';
import { exigirLogin, json, filtroFechas } from '../lib/auth.js';

export default async function handler(req, res) {
  if (!(await exigirLogin(req, res))) return;
  try {
    const p = [];
    const where = filtroFechas(req.query || {}, p).join(' AND ');
    const estatus = { 'Recibido': 0, 'En proceso': 0, 'Atendido': 0 };
    for (const r of await q(`SELECT estatus, COUNT(*)::int AS n FROM documentos WHERE ${where} GROUP BY estatus`, p)) estatus[r.estatus] = r.n;
    const meses = await q(`SELECT to_char(fecha,'YYYY-MM') AS mes, COUNT(*)::int AS n FROM documentos WHERE ${where} GROUP BY 1 ORDER BY 1 DESC LIMIT 12`, p);
    const top = col => q(`SELECT ${col} AS nombre, COUNT(*)::int AS n FROM documentos WHERE ${where} GROUP BY ${col} ORDER BY n DESC, ${col} LIMIT 5`, p);
    json(res, 200, {
      total: Object.values(estatus).reduce((a, b) => a + b, 0),
      estatus,
      meses: meses.reverse(),
      remitentes: await top('remitente'),
      destinatarios: await top('destinatario'),
    });
  } catch (e) {
    json(res, 500, { error: 'Error del servidor: ' + e.message });
  }
}
