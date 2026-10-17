import { cerrarSesion } from '../lib/auth.js';

// Cierra la sesión y regresa a la pantalla de inicio de sesión
export default function handler(req, res) {
  cerrarSesion(req, res);
  res.statusCode = 302;
  res.setHeader('Location', '/login');
  res.end();
}
