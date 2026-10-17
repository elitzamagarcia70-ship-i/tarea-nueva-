// Exportar a CSV (se abre en Excel)
import { q } from '../lib/db.js';
import { exigirLogin, json, filtroFechas } from '../lib/auth.js';

const celda = v => {
  let s = String(v ?? '');
  if (/^[=+\-@]/.test(s)) s = "'" + s; // evita fórmulas al abrir en Excel
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export default async function handler(req, res) {
  if (!(await exigirLogin(req, res))) return;
  try {
    const p = [];
    const where = filtroFechas(req.query || {}, p).join(' AND ');
    const rows = await q(
      `SELECT no_oficio, to_char(fecha,'YYYY-MM-DD') AS fecha, asunto, remitente, destinatario, estatus
       FROM documentos WHERE ${where} ORDER BY documentos.fecha DESC, id_documento DESC`, p);
    const lineas = [['No. Oficio', 'Fecha', 'Asunto', 'Remitente', 'Destinatario', 'Estatus'],
      ...rows.map(r => [r.no_oficio, r.fecha, r.asunto, r.remitente, r.destinatario, r.estatus])];
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="reporte_documentos_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.csv"`);
    res.end('\uFEFF' + lineas.map(l => l.map(celda).join(',')).join('\r\n')); // BOM: Excel respeta los acentos
  } catch (e) {
    json(res, 500, { error: 'Error del servidor: ' + e.message });
  }
}
