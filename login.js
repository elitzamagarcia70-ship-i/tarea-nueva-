import bcrypt from 'bcryptjs';
import { q, asegurarEsquema } from '../lib/db.js';
import { iniciarSesion, json } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });
  try {
    await asegurarEsquema();
    const usuario = String(req.body?.usuario ?? '').trim();
    const clave = String(req.body?.clave ?? '');
    if (!usuario || !clave) return json(res, 400, { error: 'Escribe tu usuario y contraseña.' });

    const [u] = await q('SELECT * FROM usuarios WHERE usuario = $1', [usuario]);
    if (u && await bcrypt.compare(clave, u.clave_hash)) {
      await iniciarSesion(req, res, u);
      return json(res, 200, { ok: true });
    }
    await new Promise(r => setTimeout(r, 500)); // frena intentos repetidos
    json(res, 401, { error: 'Usuario o contraseña incorrectos.' });
  } catch (e) {
    json(res, 500, { error: 'Error del servidor: ' + e.message });
  }
}
