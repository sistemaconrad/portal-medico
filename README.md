# Portal Médico — Instrucciones de despliegue

## ¿Qué es este portal?
Una app web independiente donde los médicos referentes pueden:
- Ver sus pacientes del día o historial completo (solo los que tú les asignes)
- Ver y descargar los PDFs subidos
- Agregar notas/comentarios sobre cada paciente
- Ver sus estadísticas y comisiones (solo las que tú apruebes publicar)

---

## PASO 1 — Configurar Supabase

1. Abre tu proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor**
3. Copia y pega todo el contenido de `SUPABASE-PORTAL.sql` y ejecútalo
4. Listo, las tablas están creadas

---

## PASO 2 — Dar acceso a un médico

### 2a. Crear usuario en Supabase Auth
1. Ve a **Authentication > Users**
2. Clic en **"Invite user"**
3. Escribe el correo del médico
4. El médico recibirá un correo para crear su contraseña

### 2b. Vincularlo con su registro de médico
En el SQL Editor ejecuta:
```sql
INSERT INTO portal_medicos_acceso (medico_id, email)
VALUES ('PEGA-AQUI-EL-UUID-DEL-MEDICO', 'correo@delmédico.com');
```
El UUID del médico lo encuentras en tu tabla `medicos`.

### 2c. Agregarle pacientes visibles
```sql
-- Agregar una consulta específica:
INSERT INTO portal_pacientes_visibles (medico_id, consulta_id)
VALUES ('UUID-DEL-MEDICO', 'UUID-DE-LA-CONSULTA');

-- O agregar TODAS las consultas de ese médico de un mes:
INSERT INTO portal_pacientes_visibles (medico_id, consulta_id)
SELECT 'UUID-DEL-MEDICO', id FROM consultas
WHERE medico_id = 'UUID-DEL-MEDICO'
AND fecha BETWEEN '2025-01-01' AND '2025-01-31'
AND (anulado IS NULL OR anulado = false)
ON CONFLICT DO NOTHING;
```

---

## PASO 3 — Publicar comisiones

Cuando quieras que el médico vea sus comisiones de un período:
```sql
INSERT INTO portal_comisiones_aprobadas 
  (medico_id, periodo, total_pacientes, total_comision, aprobado)
VALUES 
  ('UUID-DEL-MEDICO', '2025-01', 45, 1350.00, TRUE);
```
- Si `aprobado = FALSE`, el médico ve el período pero el monto aparece como "••••••"
- Si `aprobado = TRUE`, ve el monto completo con el desglose

---

## PASO 4 — Desplegar en Vercel

1. Sube esta carpeta `portal-medico` a un repositorio GitHub nuevo (separado del app principal)
2. Ve a [vercel.com](https://vercel.com) y crea un nuevo proyecto
3. Conecta el repositorio
4. En **Environment Variables** agrega:
   - `VITE_SUPABASE_URL` → La URL de tu proyecto Supabase
   - `VITE_SUPABASE_ANON_KEY` → El anon key de Supabase
5. Dale un dominio como `portal.tu-sanatorio.com` o el que Vercel te asigne
6. ¡Listo!

---

## Variables de entorno necesarias
```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Las encuentras en Supabase → Settings → API.

---

## Notas importantes
- El portal usa la **misma base de datos** que tu app principal (mismo Supabase)
- Los médicos NO tienen acceso a nada del sistema principal
- Si desactivas a un médico: `UPDATE portal_medicos_acceso SET activo = FALSE WHERE email = '...'`
- Puedes cambiar la contraseña de un médico desde Supabase Auth → Users
