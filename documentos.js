// Listar, guardar (crear/editar) y eliminar documentos.  GET ?action=list · POST ?action=save · POST ?action=delete
import { del } from '@vercel/blob';
import { q } from '../lib/db.js';
import { exigirLogin, json, filtroFechas } from '../lib/auth.js';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const MAX = { no_oficio: 30, fecha: 10, asunto: 200, remitente: 120, destinatario: 120, estatus: 20 };
const ESTATUS = ['Recibido', 'En proceso', 'Atendido'];

// Solo se aceptan archivos que subió /api/subir (Vercel Blob, carpeta documentos/)
function refValida(ref) {
  try {
    const u = new URL(ref);
    return u.protocol === 'https:' && u.hostname.endsWith('.blob.vercel-storage.com') && u.pathname.startsWith('/documentos/');
  } catch { return false; }
}
const borrarBlob = async url => { try { if (url) await del(url); } catch { /* si falla, no pasa nada */ } };

export default async function handler(req, res) {
  if (!(await exigirLogin(req, res))) return;
  const a = req.query?.action || '';
  try {
    // --- Listado con búsqueda, filtros y paginación ---
    if (a === 'list' && req.method === 'GET') {
      const p = [];
      const w = filtroFechas(req.query, p);
      const texto = String(req.query.q ?? '').trim();
      if (texto) {
        p.push(`%${texto.replace(/[\\%_]/g, '\\$&')}%`);
        const n = p.length;
        w.push(`(no_oficio ILIKE $${n} OR asunto ILIKE $${n} OR remitente ILIKE $${n} OR destinatario ILIKE $${n})`);
      }
      if (req.query.estatus) { p.push(String(req.query.estatus)); w.push(`estatus = $${p.length}`); }
      const where = w.join(' AND ');
      const per = 5, page = Math.max(1, parseInt(req.query.page) || 1), off = (page - 1) * per;
      const [{ n: total }] = await q(`SELECT COUNT(*)::int AS n FROM documentos WHERE ${where}`, p);
      const rows = await q(
        `SELECT id_documento, no_oficio, to_char(fecha,'YYYY-MM-DD') AS fecha, asunto, remitente, destinatario, estatus, archivo_pdf
         FROM documentos WHERE ${where} ORDER BY documentos.fecha DESC, id_documento DESC LIMIT ${per} OFFSET ${off}`, p);
      // Al navegador solo le llega el nombre del archivo; el PDF se pide por /api/archivo?id=...
      return json(res, 200, {
        rows: rows.map(r => ({ ...r, archivo_pdf: r.archivo_pdf ? decodeURIComponent(r.archivo_pdf.split('/').pop()) : null })),
        total, page, per,
      });
    }

    // --- Crear o editar ---
    if (a === 'save' && req.method === 'POST') {
      const b = req.body || {};
      const id = parseInt(b.id) || 0;
      const v = {};
      for (const [k, largo] of Object.entries(MAX)) {
        v[k] = String(b[k] ?? '').trim();
        if (v[k] === '') return json(res, 422, { error: `Falta el campo: ${k}` });
        if ([...v[k]].length > largo) return json(res, 422, { error: `El campo ${k} admite máximo ${largo} caracteres` });
      }
      const f = new Date(v.fecha + 'T00:00:00Z');
      if (!FECHA.test(v.fecha) || isNaN(f) || f.toISOString().slice(0, 10) !== v.fecha) return json(res, 422, { error: 'La fecha no es válida' });
      if (!ESTATUS.includes(v.estatus)) return json(res, 422, { error: 'Estatus inválido' });

      const archivo = b.archivo ? String(b.archivo) : null;
      if (archivo && !refValida(archivo)) return json(res, 422, { error: 'Archivo no válido. Vuelve a adjuntar el PDF.' });
      if (!id && !archivo) return json(res, 422, { error: 'Adjunta una foto o un PDF del documento' });

      const vals = [v.no_oficio, v.fecha, v.asunto, v.remitente, v.destinatario, v.estatus];
      if (id) {
        const [ant] = await q('SELECT archivo_pdf FROM documentos WHERE id_documento = $1', [id]);
        if (!ant) return json(res, 404, { error: 'El documento no existe' });
        let sql = 'UPDATE documentos SET no_oficio=$1,fecha=$2,asunto=$3,remitente=$4,destinatario=$5,estatus=$6';
        if (archivo) { vals.push(archivo); sql += `,archivo_pdf=$${vals.length}`; }
        vals.push(id);
        await q(sql + ` WHERE id_documento=$${vals.length}`, vals);
        if (archivo && ant.archivo_pdf && ant.archivo_pdf !== archivo) await borrarBlob(ant.archivo_pdf);
      } else {
        await q('INSERT INTO documentos (no_oficio,fecha,asunto,remitente,destinatario,estatus,archivo_pdf) VALUES ($1,$2,$3,$4,$5,$6,$7)', [...vals, archivo]);
      }
      return json(res, 200, { ok: true });
    }

    // --- Eliminar un documento y su archivo ---
    if (a === 'delete' && req.method === 'POST') {
      const id = parseInt(req.body?.id) || 0;
      const [d] = await q('DELETE FROM documentos WHERE id_documento = $1 RETURNING archivo_pdf', [id]);
      if (d) await borrarBlob(d.archivo_pdf);
      return json(res, 200, { ok: true });
    }

    json(res, 400, { error: 'Acción no válida' });
  } catch (e) {
    if (e.code === '23505') return json(res, 409, { error: 'Ese número de oficio ya existe' });
    json(res, 500, { error: 'Error del servidor: ' + e.message });
  }
}
