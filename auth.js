// Sesión con cookie firmada (JWT). Sustituye a las sesiones de PHP, que no funcionan en Vercel.
import { SignJWT, jwtVerify } from 'jose';

const COOKIE = 'sesion';
const HORAS = 8;

function secreto() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) throw new Error('Falta JWT_SECRET (mínimo 16 caracteres)');
  return new TextEncoder().encode(s);
}

// Responde en JSON con un código HTTP
export function json(res, codigo, datos) {
  res.statusCode = codigo;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(datos));
}

function cookie(req, valor, maxAge) {
  const https = (req.headers['x-forwarded-proto'] || '').split(',')[0] === 'https';
  return `${COOKIE}=${valor}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${https ? '; Secure' : ''}`;
}

export async function iniciarSesion(req, res, usuario) {
  const token = await new SignJWT({ id: usuario.id_usuario, nombre: usuario.nombre })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${HORAS}h`)
    .sign(secreto());
  res.setHeader('Set-Cookie', cookie(req, token, HORAS * 3600));
}

export function cerrarSesion(req, res) {
  res.setHeader('Set-Cookie', cookie(req, '', 0));
}

// Devuelve { id, nombre } si hay sesión válida, o null
export async function leerSesion(req) {
  const m = (req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return null;
  try {
    const { payload } = await jwtVerify(m[1], secreto());
    return payload;
  } catch { return null; }
}

// Para las API: si no hay sesión responde 401 y devuelve null
export async function exigirLogin(req, res) {
  const s = await leerSesion(req);
  if (!s) json(res, 401, { error: 'Sesión vencida. Inicia sesión de nuevo.' });
  return s;
}

// Filtro por rango de fechas (desde / hasta) con parámetros $n
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
export function filtroFechas(g, p, w = ['1=1']) {
  if (FECHA.test(g.desde || '')) { p.push(g.desde); w.push(`fecha >= $${p.length}`); }
  if (FECHA.test(g.hasta || '')) { p.push(g.hasta); w.push(`fecha <= $${p.length}`); }
  return w;
}
