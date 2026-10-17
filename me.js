import { leerSesion, json } from '../lib/auth.js';

// Dice si hay sesión y con qué nombre (lo usan las páginas para validar y mostrar el usuario)
export default async function handler(req, res) {
  try {
    const s = await leerSesion(req);
    if (!s) return json(res, 401, { error: 'Sin sesión' });
    json(res, 200, { nombre: s.nombre });
  } catch (e) {
    json(res, 500, { error: e.message });
  }
}
