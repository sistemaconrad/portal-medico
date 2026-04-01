-- ============================================================
-- PORTAL MÉDICO — Tablas nuevas en Supabase
-- Ejecutar en el SQL Editor de tu proyecto Supabase
-- ============================================================

-- 1. Tabla de acceso: qué email puede entrar y a qué médico está vinculado
CREATE TABLE IF NOT EXISTS portal_medicos_acceso (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de pacientes visibles: el sanatorio decide cuáles ve el médico
CREATE TABLE IF NOT EXISTS portal_pacientes_visibles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  consulta_id UUID NOT NULL REFERENCES consultas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (medico_id, consulta_id)
);

-- 3. Notas del médico sobre un paciente/consulta
CREATE TABLE IF NOT EXISTS portal_notas_medico (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consulta_id UUID NOT NULL REFERENCES consultas(id) ON DELETE CASCADE,
  medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  nota TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (consulta_id, medico_id)
);

-- 4. Comisiones aprobadas: el sanatorio publica período por período
CREATE TABLE IF NOT EXISTS portal_comisiones_aprobadas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  medico_id UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL,           -- Formato: '2025-01' (año-mes)
  rango_fechas TEXT,               -- Opcional: '2025-01-01/2025-01-31'
  total_pacientes INTEGER DEFAULT 0,
  total_comision DECIMAL(10,2) DEFAULT 0,
  aprobado BOOLEAN DEFAULT FALSE,  -- FALSE = el médico ve "Pendiente", TRUE = ve el monto
  notas_admin TEXT,                -- Notas internas (solo el admin las ve)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (medico_id, periodo)
);

-- ============================================================
-- Índices
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_portal_acceso_email ON portal_medicos_acceso(email);
CREATE INDEX IF NOT EXISTS idx_portal_acceso_medico ON portal_medicos_acceso(medico_id);
CREATE INDEX IF NOT EXISTS idx_portal_visibles_medico ON portal_pacientes_visibles(medico_id);
CREATE INDEX IF NOT EXISTS idx_portal_visibles_consulta ON portal_pacientes_visibles(consulta_id);
CREATE INDEX IF NOT EXISTS idx_portal_notas_consulta ON portal_notas_medico(consulta_id, medico_id);
CREATE INDEX IF NOT EXISTS idx_portal_comisiones_medico ON portal_comisiones_aprobadas(medico_id);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE portal_medicos_acceso ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_pacientes_visibles ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_notas_medico ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_comisiones_aprobadas ENABLE ROW LEVEL SECURITY;

-- Políticas: el médico logueado solo accede a SUS datos

-- portal_medicos_acceso: solo puede leer su propio registro
CREATE POLICY "medico_lee_su_acceso" ON portal_medicos_acceso
  FOR SELECT USING (email = auth.email());

-- portal_pacientes_visibles: solo ve los suyos
CREATE POLICY "medico_ve_sus_pacientes" ON portal_pacientes_visibles
  FOR SELECT USING (
    medico_id IN (
      SELECT medico_id FROM portal_medicos_acceso WHERE email = auth.email() AND activo = TRUE
    )
  );

-- portal_notas_medico: lee y escribe solo sus notas
CREATE POLICY "medico_lee_sus_notas" ON portal_notas_medico
  FOR SELECT USING (
    medico_id IN (
      SELECT medico_id FROM portal_medicos_acceso WHERE email = auth.email() AND activo = TRUE
    )
  );
CREATE POLICY "medico_escribe_sus_notas" ON portal_notas_medico
  FOR INSERT WITH CHECK (
    medico_id IN (
      SELECT medico_id FROM portal_medicos_acceso WHERE email = auth.email() AND activo = TRUE
    )
  );
CREATE POLICY "medico_actualiza_sus_notas" ON portal_notas_medico
  FOR UPDATE USING (
    medico_id IN (
      SELECT medico_id FROM portal_medicos_acceso WHERE email = auth.email() AND activo = TRUE
    )
  );

-- portal_comisiones_aprobadas: solo ve las suyas y solo las aprobadas
CREATE POLICY "medico_ve_sus_comisiones" ON portal_comisiones_aprobadas
  FOR SELECT USING (
    medico_id IN (
      SELECT medico_id FROM portal_medicos_acceso WHERE email = auth.email() AND activo = TRUE
    )
  );

-- ============================================================
-- Dar acceso de lectura a consultas y archivos (si tienen RLS)
-- ============================================================
-- Asegurarse que el médico logueado pueda leer las consultas que tiene asignadas
-- Si ya tienes políticas abiertas en 'consultas' y 'archivos_estudios', no es necesario.
-- Si no, agrega:

-- CREATE POLICY "portal_lee_consultas" ON consultas
--   FOR SELECT USING (true);  -- o más restrictivo si se necesita

-- CREATE POLICY "portal_lee_archivos" ON archivos_estudios
--   FOR SELECT USING (true);

-- ============================================================
-- Ejemplo: Dar acceso a un médico en el portal
-- ============================================================
-- 1. Primero invitar al médico desde Supabase Auth:
--    Authentication > Users > Invite user → poner el email del médico
--
-- 2. Luego insertar su acceso aquí:
-- INSERT INTO portal_medicos_acceso (medico_id, email)
-- VALUES ('UUID-DEL-MEDICO-EN-TU-TABLA-MEDICOS', 'doctor@ejemplo.com');
--
-- 3. Luego agregar qué consultas puede ver:
-- INSERT INTO portal_pacientes_visibles (medico_id, consulta_id)
-- VALUES ('UUID-DEL-MEDICO', 'UUID-DE-LA-CONSULTA');
-- (O puedes automatizar esto con un trigger cuando se registra una consulta con ese médico)
--
-- 4. Publicar una comisión:
-- INSERT INTO portal_comisiones_aprobadas (medico_id, periodo, total_pacientes, total_comision, aprobado)
-- VALUES ('UUID-DEL-MEDICO', '2025-01', 45, 1350.00, TRUE);
