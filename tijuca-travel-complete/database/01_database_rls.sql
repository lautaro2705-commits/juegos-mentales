-- =====================================================================
-- TIJUCA TRAVEL - DATABASE SECURITY LAYER (PostgreSQL RLS)
-- =====================================================================
-- Propósito: Implementar Row Level Security para aislamiento multi-tenant
-- Autor: Senior DevSecOps Team
-- Fecha: 2026-02-09
-- Versión: 1.0
-- =====================================================================

-- =====================================================================
-- PASO 1: HABILITAR EXTENSIONES DE SEGURIDAD
-- =====================================================================

-- pgcrypto: Para encriptación de columnas sensibles
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- uuid-ossp: Para generación de UUIDs v4 (reemplazar IDs secuenciales)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================================
-- PASO 2: CREAR TABLA DE AGENCIAS (TENANTS)
-- =====================================================================

CREATE TABLE agencias (
    -- UUID como Primary Key (NO secuencial, impredecible)
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Datos de la agencia
    nombre VARCHAR(255) NOT NULL,
    razon_social VARCHAR(255) NOT NULL,
    cuit VARCHAR(13) UNIQUE NOT NULL,

    -- Configuración multi-moneda
    moneda_principal VARCHAR(3) DEFAULT 'ARS' CHECK (moneda_principal IN ('ARS', 'USD')),

    -- Plan SaaS (para rate limiting futuro)
    plan VARCHAR(50) DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'premium', 'enterprise')),

    -- Estado de la cuenta
    activa BOOLEAN DEFAULT true,

    -- API Key (encriptada)
    api_key_hash TEXT NOT NULL, -- Almacenar hash bcrypt, nunca plaintext

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_agencias_cuit ON agencias(cuit);
CREATE INDEX idx_agencias_activa ON agencias(activa) WHERE activa = true;

-- =====================================================================
-- PASO 3: CREAR TABLA DE VENTAS (CON TENANT_ID)
-- =====================================================================

CREATE TABLE ventas (
    -- UUID como Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- ⚠️ CRÍTICO: Foreign Key al tenant (NUNCA NULL)
    agencia_id UUID NOT NULL REFERENCES agencias(id) ON DELETE CASCADE,

    -- Datos de la venta
    cliente_nombre VARCHAR(255) NOT NULL,
    cliente_email VARCHAR(255),
    cliente_telefono VARCHAR(50),

    -- Información del producto/servicio
    descripcion TEXT NOT NULL,
    destino VARCHAR(255),

    -- Datos financieros
    moneda VARCHAR(3) NOT NULL CHECK (moneda IN ('ARS', 'USD')),
    monto_base NUMERIC(12, 2) NOT NULL CHECK (monto_base >= 0),

    -- Impuestos argentinos (Dólar MEP, PAIS, Percepciones)
    impuesto_pais NUMERIC(12, 2) DEFAULT 0,
    percepcion_ganancias NUMERIC(12, 2) DEFAULT 0,
    percepcion_iibb NUMERIC(12, 2) DEFAULT 0,
    monto_total NUMERIC(12, 2) NOT NULL CHECK (monto_total >= 0),

    -- Estado de la venta
    estado VARCHAR(50) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'confirmada', 'cancelada', 'reembolsada')),

    -- Trazabilidad
    vendido_por_hunterbot BOOLEAN DEFAULT false,
    conversacion_whatsapp_id VARCHAR(255), -- ID de la conversación del bot

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices críticos para RLS (debe incluir agencia_id siempre)
CREATE INDEX idx_ventas_agencia_id ON ventas(agencia_id);
CREATE INDEX idx_ventas_agencia_estado ON ventas(agencia_id, estado);
CREATE INDEX idx_ventas_created_at ON ventas(created_at DESC);

-- =====================================================================
-- PASO 4: HABILITAR ROW LEVEL SECURITY (RLS)
-- =====================================================================

-- Activar RLS en la tabla ventas
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;

-- Activar RLS en la tabla agencias (para que no puedan verse entre sí)
ALTER TABLE agencias ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- PASO 5: CREAR POLÍTICAS DE SEGURIDAD (RLS POLICIES)
-- =====================================================================

-- =====================================================================
-- POLÍTICA 1: Las agencias SOLO pueden ver sus propias ventas
-- =====================================================================

-- La aplicación debe setear: SET LOCAL app.current_tenant_id = '<UUID>';
-- Esto se hace en el middleware de FastAPI ANTES de cada query

CREATE POLICY ventas_tenant_isolation ON ventas
    FOR ALL  -- Aplica a SELECT, INSERT, UPDATE, DELETE
    USING (agencia_id = current_setting('app.current_tenant_id')::UUID)
    WITH CHECK (agencia_id = current_setting('app.current_tenant_id')::UUID);

-- ⚠️ EXPLICACIÓN:
-- - USING: Filtro para SELECT/UPDATE/DELETE (solo ve filas donde agencia_id coincida)
-- - WITH CHECK: Validación para INSERT/UPDATE (no puede insertar/actualizar con otro agencia_id)

-- =====================================================================
-- POLÍTICA 2: Las agencias SOLO pueden ver su propio registro
-- =====================================================================

CREATE POLICY agencias_self_access ON agencias
    FOR SELECT
    USING (id = current_setting('app.current_tenant_id')::UUID);

-- No permitimos INSERT/UPDATE/DELETE desde la app normal
-- (solo el superadmin puede crear/modificar agencias)

-- =====================================================================
-- PASO 6: CREAR ROL DE APLICACIÓN (NO usar superuser)
-- =====================================================================

-- Crear usuario específico para la aplicación FastAPI
CREATE ROLE tijuca_app WITH LOGIN PASSWORD 'CHANGE_THIS_IN_PRODUCTION_USING_ENV_VAR';

-- Otorgar permisos mínimos necesarios
GRANT CONNECT ON DATABASE tijuca_db TO tijuca_app;
GRANT USAGE ON SCHEMA public TO tijuca_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ventas TO tijuca_app;
GRANT SELECT ON agencias TO tijuca_app;

-- Permitir uso de secuencias (para UUIDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO tijuca_app;

-- =====================================================================
-- PASO 7: FUNCIÓN PARA ACTUALIZAR updated_at AUTOMÁTICAMENTE
-- =====================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a las tablas
CREATE TRIGGER update_agencias_updated_at
    BEFORE UPDATE ON agencias
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ventas_updated_at
    BEFORE UPDATE ON ventas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- PASO 8: DATOS DE PRUEBA (TESTING RLS)
-- =====================================================================

-- Insertar 2 agencias de prueba
INSERT INTO agencias (id, nombre, razon_social, cuit, api_key_hash) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'Viajes del Sol', 'Viajes del Sol S.A.', '30-12345678-9', crypt('test_api_key_sol', gen_salt('bf'))),
    ('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'Turismo Global', 'Turismo Global S.R.L.', '30-98765432-1', crypt('test_api_key_global', gen_salt('bf')));

-- Insertar ventas para cada agencia
INSERT INTO ventas (agencia_id, cliente_nombre, descripcion, destino, moneda, monto_base, monto_total) VALUES
    -- Ventas de "Viajes del Sol"
    ('550e8400-e29b-41d4-a716-446655440000', 'Juan Pérez', 'Paquete a Bariloche 7 días', 'Bariloche', 'ARS', 850000.00, 850000.00),
    ('550e8400-e29b-41d4-a716-446655440000', 'María González', 'Vuelo + Hotel Miami', 'Miami', 'USD', 1200.00, 1200.00),

    -- Ventas de "Turismo Global"
    ('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'Carlos Ramírez', 'Crucero por el Caribe', 'Caribe', 'USD', 2500.00, 2500.00),
    ('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'Ana Silva', 'Tour Europa 15 días', 'Europa', 'USD', 3800.00, 3800.00);

-- =====================================================================
-- PASO 9: TESTING DE POLÍTICAS RLS
-- =====================================================================

-- ⚠️ IMPORTANTE: Conectar como tijuca_app (no como superuser)
-- Los superusers BYPASEAN RLS automáticamente

-- Simular contexto de "Viajes del Sol"
SET LOCAL app.current_tenant_id = '550e8400-e29b-41d4-a716-446655440000';

-- Esta query SOLO debe retornar 2 ventas (Juan y María)
SELECT id, cliente_nombre, destino, monto_total FROM ventas;

-- Simular contexto de "Turismo Global"
SET LOCAL app.current_tenant_id = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

-- Esta query SOLO debe retornar 2 ventas (Carlos y Ana)
SELECT id, cliente_nombre, destino, monto_total FROM ventas;

-- =====================================================================
-- PASO 10: TEST DE BYPASS (DEBE FALLAR)
-- =====================================================================

-- Intentar insertar una venta con agencia_id diferente al tenant actual
SET LOCAL app.current_tenant_id = '550e8400-e29b-41d4-a716-446655440000';

-- Esto DEBE FALLAR (violar la política WITH CHECK)
-- INSERT INTO ventas (agencia_id, cliente_nombre, descripcion, moneda, monto_base, monto_total)
-- VALUES ('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'Atacante', 'Intento de bypass', 'ARS', 1000, 1000);
-- ERROR: new row violates row-level security policy for table "ventas"

-- =====================================================================
-- NOTAS DE SEGURIDAD ADICIONALES
-- =====================================================================

-- 1. NUNCA ejecutar queries como superuser en producción
-- 2. El app.current_tenant_id DEBE setearse en CADA transacción
-- 3. Usar TRANSACTION ISOLATION LEVEL para prevenir race conditions
-- 4. Monitorear intentos de bypass en pg_stat_statements
-- 5. Rotar api_key_hash periódicamente
-- 6. Implementar backup encriptado con pgBackRest o similar

-- =====================================================================
-- CHECKLIST DE DESPLIEGUE
-- =====================================================================

-- [ ] Cambiar password de tijuca_app usando variable de entorno
-- [ ] Habilitar SSL/TLS en PostgreSQL (require certificado)
-- [ ] Configurar pg_hba.conf para permitir SOLO conexiones desde backend
-- [ ] Habilitar pgAudit para log de todas las queries
-- [ ] Configurar automatic_vacuum para tablas con alta rotación
-- [ ] Implementar backup diario encriptado
-- [ ] Monitorear slow queries que no usen índice de agencia_id
