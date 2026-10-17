// Recibe un PDF (cuerpo crudo, máx. 4 MB) y lo guarda en Vercel Blob. Devuelve la referencia para /api/documentos?action=save
import { randomBytes } from 'node:crypto';
import { put } from '@vercel/blob';
import { exigirLogin, json } from '../lib/auth.js';

export const config = { api: { bodyParser: false } };
const MAX = 4 * 1024 * 1024; // las funciones de Vercel aceptan hasta 4.5 MB por petición

async function leer(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  const partes = []; let n = 0;
  for await (const c of req) {
    n += c.length;
    if (n > MAX) throw Object.assign(new Error('grande'), { grande: true });
    partes.push(c);
  }
  return Buffer.concat(partes);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });
  if (!(await exigirLogin(req, res))) return;
  try {
    if (Number(req.headers['content-length'] || 0) > MAX) return json(res, 413, { error: 'El PDF no puede pesar más de 4 MB' });
    const buf = await leer(req);
    // Se valida el tipo REAL: todo PDF empieza con "%PDF-"
    if (buf.length > MAX || buf.length < 8 || buf.subarray(0, 5).toString('latin1') !== '%PDF-')
      return json(res, 422, { error: 'Solo se permiten archivos PDF de hasta 4 MB' });
    const blob = await put(`documentos/${randomBytes(8).toString('hex')}.pdf`, buf, {
      access: 'public', contentType: 'application/pdf', addRandomSuffix: false,
    });
    json(res, 200, { ref: blob.url });
  } catch (e) {
    if (e.grande) return json(res, 413, { error: 'El PDF no puede pesar más de 4 MB' });
    json(res, 500, { error: 'No se pudo guardar el archivo: ' + e.message });
  }
}
