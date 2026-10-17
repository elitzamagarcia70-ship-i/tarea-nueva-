// Conexión a Postgres (Neon) y creación automática de tablas + usuario inicial.
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

let cliente;
export function q(texto, params = []) {
  if (!cliente) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error('Falta la variable DATABASE_URL');
    cliente = neon(url);
  }
  return cliente.query(texto, params); // devuelve un arreglo de filas
}

let listo = false;
// Crea las tablas si no existen y el usuario admin / admin123 la primera vez
export async function asegurarEsquema() {
  if (listo) return;
  await q(`CREATE TABLE IF NOT EXISTS documentos (
    id_documento SERIAL PRIMARY KEY,
    no_oficio VARCHAR(30) NOT NULL UNIQUE,
    fecha DATE NOT NULL,
    asunto VARCHAR(200) NOT NULL,
    remitente VARCHAR(120) NOT NULL,
    destinatario VARCHAR(120) NOT NULL,
    estatus VARCHAR(20) NOT NULL DEFAULT 'Recibido' CHECK (estatus IN ('Recibido','En proceso','Atendido')),
    archivo_pdf VARCHAR(500),
    creado TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  await q('CREATE INDEX IF NOT EXISTS documentos_fecha_idx ON documentos (fecha)');
  await q('CREATE INDEX IF NOT EXISTS documentos_estatus_idx ON documentos (estatus)');
  await q(`CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario SERIAL PRIMARY KEY,
    usuario VARCHAR(40) NOT NULL UNIQUE,
    nombre VARCHAR(80) NOT NULL,
    clave_hash VARCHAR(255) NOT NULL,
    creado TIMESTAMPTZ NOT NULL DEFAULT now()
  )`);
  const [{ n }] = await q('SELECT COUNT(*)::int AS n FROM usuarios');
  if (!n) {
    await q('INSERT INTO usuarios (usuario, nombre, clave_hash) VALUES ($1,$2,$3) ON CONFLICT (usuario) DO NOTHING',
      ['admin', 'Administrador', await bcrypt.hash('admin123', 10)]);
  }
  listo = true;
}
