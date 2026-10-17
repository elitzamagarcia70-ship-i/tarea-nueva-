-- Esquema para Postgres (Neon). Es OPCIONAL: la primera vez que alguien inicia sesión,
-- el sistema crea las tablas y el usuario admin automáticamente.
-- Ejecútalo en el SQL Editor de Neon solo si quieres cargar los datos de prueba.

CREATE TABLE IF NOT EXISTS documentos (
  id_documento SERIAL PRIMARY KEY,
  no_oficio    VARCHAR(30)  NOT NULL UNIQUE,
  fecha        DATE         NOT NULL,
  asunto       VARCHAR(200) NOT NULL,
  remitente    VARCHAR(120) NOT NULL,
  destinatario VARCHAR(120) NOT NULL,
  estatus      VARCHAR(20)  NOT NULL DEFAULT 'Recibido'
               CHECK (estatus IN ('Recibido','En proceso','Atendido')),
  archivo_pdf  VARCHAR(500),
  creado       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS documentos_fecha_idx   ON documentos (fecha);
CREATE INDEX IF NOT EXISTS documentos_estatus_idx ON documentos (estatus);

CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario SERIAL PRIMARY KEY,
  usuario    VARCHAR(40)  NOT NULL UNIQUE,
  nombre     VARCHAR(80)  NOT NULL,
  clave_hash VARCHAR(255) NOT NULL,
  creado     TIMESTAMPTZ  NOT NULL DEFAULT now()
);

INSERT INTO documentos (no_oficio,fecha,asunto,remitente,destinatario,estatus) VALUES
('001/2026','2026-10-05','Solicitud de materiales','Dirección Administrativa','Coordinación Académica','Recibido'),
('002/2026','2026-10-04','Invitación a evento','Secretaría General','Dirección ETDA','En proceso'),
('003/2026','2026-10-03','Reporte de actividades','Departamento de Sistemas','Dirección ETDA','Atendido'),
('004/2026','2026-10-02','Solicitud de apoyo','Institución Externa','Coordinación de Investigación','Recibido'),
('005/2026','2026-10-01','Oficio de colaboración','C. Municipal de Tapachula','Rectoría','En proceso'),
('006/2026','2026-09-03','Aviso de mantenimiento','Servicios Escolares','Dirección ETDA','Recibido'),
('007/2026','2026-10-02','Convocatoria','C. Municipal de Tapachula','Dirección ETDA','Atendido'),
('008/2026','2026-08-01','Invitación a taller','Institución Externa','Coordinación de Investigación','Recibido'),
('009/2026','2026-08-02','Aviso de mantenimiento','Dirección Administrativa','Lenguas','Recibido'),
('010/2026','2026-08-11','Solicitud de constancia','C. Municipal de Tapachula','Lenguas','En proceso'),
('011/2026','2026-08-04','Solicitud de constancia','C. Municipal de Tapachula','Coordinación Académica','En proceso'),
('012/2026','2026-09-03','Invitación a taller','C. Municipal de Tapachula','Rectoría','Atendido'),
('013/2026','2026-10-03','Invitación a taller','C. Municipal de Tapachula','Lenguas','Atendido'),
('014/2026','2026-08-06','Invitación a taller','C. Municipal de Tapachula','Dirección ETDA','Atendido'),
('015/2026','2026-08-10','Oficio de comisión','Institución Externa','Lenguas','En proceso'),
('016/2026','2026-09-08','Reporte de asistencia','Departamento de Sistemas','Rectoría','Recibido'),
('017/2026','2026-08-12','Oficio de comisión','Dirección Administrativa','Lenguas','En proceso'),
('018/2026','2026-10-08','Convocatoria','Servicios Escolares','Coordinación de Investigación','En proceso'),
('019/2026','2026-10-02','Invitación a taller','C. Municipal de Tapachula','Coordinación de Investigación','Recibido'),
('020/2026','2026-09-03','Reporte de asistencia','Institución Externa','Dirección ETDA','Atendido')
ON CONFLICT (no_oficio) DO NOTHING;
