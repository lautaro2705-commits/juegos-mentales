-- =====================================================================
-- TIJUCA TRAVEL - IMMUTABLE AUDIT LOG TABLE
-- =====================================================================
-- Propósito: Registrar cambios críticos financieros de forma inmutable
--            para cumplir con auditorías y compliance
-- Autor: Senior DevSecOps Team
-- Fecha: 2026-02-09
-- Versión: 1.0
-- =====================================================================

-- =====================================================================
-- PASO 1: CREAR TABLA DE AUDITORÍA (APPEND-ONLY)
-- =====================================================================

CREATE TABLE security_logs (
    -- Primary Key UUID (no secuencial para evitar IDOR)
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Contexto del Tenant (NUNCA NULL)
    agencia_id UUID NOT NULL REFERENCES agencias(id) ON DELETE RESTRICT,
    -- ⚠️ ON DELETE RESTRICT: No se puede eliminar una agencia si tiene logs

    -- Información del Usuario/Actor
    user_id UUID,  -- ID del usuario que realizó la acción (si aplica)
    user_email VARCHAR(255),
    user_ip_address INET,  -- Dirección IP del cliente
    user_agent TEXT,  -- Navegador/dispositivo

    -- Contexto de la Acción
    action_type VARCHAR(50) NOT NULL,  -- CREATE, UPDATE, DELETE, LOGIN, LOGOUT, etc.
    resource_type VARCHAR(50) NOT NULL,  -- ventas, usuarios, precios, configuracion
    resource_id UUID,  -- ID del recurso afectado (ej: venta_id)

    -- Detalles de la Acción
    action_description TEXT NOT NULL,  -- Descripción legible: "Cambió precio de $1000 a $1200"

    -- Estado Anterior y Nuevo (JSON)
    old_value JSONB,  -- Estado antes del cambio
    new_value JSONB,  -- Estado después del cambio

    -- Metadatos de Auditoría
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
    tags TEXT[],  -- Etiquetas para búsqueda: ['financial', 'compliance', 'security']

    -- Flags de Seguridad
    is_suspicious BOOLEAN DEFAULT false,  -- Marcado por sistema de detección
    requires_review BOOLEAN DEFAULT false,  -- Requiere revisión humana

    -- Timestamp (INMUTABLE)
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Hash de Integridad (para detectar manipulación)
    integrity_hash VARCHAR(64) NOT NULL  -- SHA-256 de todos los campos
);

-- =====================================================================
-- PASO 2: ÍNDICES PARA PERFORMANCE Y BÚSQUEDA
-- =====================================================================

-- Índice principal por agencia y fecha (queries más comunes)
CREATE INDEX idx_security_logs_agencia_created ON security_logs(agencia_id, created_at DESC);

-- Índice por tipo de acción
CREATE INDEX idx_security_logs_action_type ON security_logs(action_type);

-- Índice por recurso (para ver historial de un recurso específico)
CREATE INDEX idx_security_logs_resource ON security_logs(resource_type, resource_id);

-- Índice por flags de seguridad (para alertas)
CREATE INDEX idx_security_logs_suspicious ON security_logs(is_suspicious, requires_review) WHERE is_suspicious = true OR requires_review = true;

-- Índice GIN para búsqueda en JSONB (old_value/new_value)
CREATE INDEX idx_security_logs_old_value ON security_logs USING GIN (old_value);
CREATE INDEX idx_security_logs_new_value ON security_logs USING GIN (new_value);

-- Índice GIN para búsqueda en arrays (tags)
CREATE INDEX idx_security_logs_tags ON security_logs USING GIN (tags);

-- =====================================================================
-- PASO 3: HABILITAR ROW LEVEL SECURITY
-- =====================================================================

-- Las agencias SOLO pueden ver sus propios logs
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY security_logs_tenant_isolation ON security_logs
    FOR SELECT  -- SOLO SELECT permitido (no INSERT/UPDATE/DELETE desde app)
    USING (agencia_id = current_setting('app.current_tenant_id')::UUID);

-- ⚠️ INSERT se hace desde función SECURITY DEFINER (ver siguiente paso)
-- ⚠️ UPDATE/DELETE están PROHIBIDOS (tabla append-only)

-- =====================================================================
-- PASO 4: FUNCIÓN PARA INSERTAR LOGS DE FORMA SEGURA
-- =====================================================================

CREATE OR REPLACE FUNCTION insert_security_log(
    p_agencia_id UUID,
    p_user_id UUID,
    p_user_email VARCHAR,
    p_user_ip_address INET,
    p_user_agent TEXT,
    p_action_type VARCHAR,
    p_resource_type VARCHAR,
    p_resource_id UUID,
    p_action_description TEXT,
    p_old_value JSONB,
    p_new_value JSONB,
    p_severity VARCHAR DEFAULT 'info',
    p_tags TEXT[] DEFAULT '{}',
    p_is_suspicious BOOLEAN DEFAULT false
) RETURNS UUID
SECURITY DEFINER  -- ⚠️ Ejecuta con permisos del owner, bypasea RLS
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_log_id UUID;
    v_integrity_hash VARCHAR(64);
    v_hash_input TEXT;
BEGIN
    -- Generar UUID para el log
    v_log_id := uuid_generate_v4();

    -- Crear string para hash de integridad
    v_hash_input := CONCAT(
        v_log_id::TEXT,
        p_agencia_id::TEXT,
        COALESCE(p_user_id::TEXT, ''),
        COALESCE(p_user_email, ''),
        COALESCE(HOST(p_user_ip_address), ''),
        p_action_type,
        p_resource_type,
        COALESCE(p_resource_id::TEXT, ''),
        p_action_description,
        COALESCE(p_old_value::TEXT, ''),
        COALESCE(p_new_value::TEXT, ''),
        NOW()::TEXT
    );

    -- Calcular SHA-256
    v_integrity_hash := encode(digest(v_hash_input, 'sha256'), 'hex');

    -- Insertar log (bypasea RLS porque es SECURITY DEFINER)
    INSERT INTO security_logs (
        id,
        agencia_id,
        user_id,
        user_email,
        user_ip_address,
        user_agent,
        action_type,
        resource_type,
        resource_id,
        action_description,
        old_value,
        new_value,
        severity,
        tags,
        is_suspicious,
        integrity_hash,
        created_at
    ) VALUES (
        v_log_id,
        p_agencia_id,
        p_user_id,
        p_user_email,
        p_user_ip_address,
        p_user_agent,
        p_action_type,
        p_resource_type,
        p_resource_id,
        p_action_description,
        p_old_value,
        p_new_value,
        p_severity,
        p_tags,
        p_is_suspicious,
        v_integrity_hash,
        NOW()
    );

    RETURN v_log_id;
END;
$$;

-- Otorgar permisos de ejecución a la aplicación
GRANT EXECUTE ON FUNCTION insert_security_log TO tijuca_app;

-- =====================================================================
-- PASO 5: TRIGGER AUTOMÁTICO PARA CAMBIOS EN VENTAS
-- =====================================================================

CREATE OR REPLACE FUNCTION log_ventas_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_action_type VARCHAR(50);
    v_description TEXT;
    v_old_value JSONB;
    v_new_value JSONB;
    v_severity VARCHAR(20);
    v_tags TEXT[];
    v_is_suspicious BOOLEAN;
BEGIN
    -- Determinar tipo de acción
    IF (TG_OP = 'INSERT') THEN
        v_action_type := 'CREATE';
        v_description := 'Nueva venta creada: ' || NEW.cliente_nombre || ' - ' || NEW.destino;
        v_old_value := NULL;
        v_new_value := to_jsonb(NEW);
        v_severity := 'info';
        v_tags := ARRAY['financial', 'sales'];
        v_is_suspicious := false;

    ELSIF (TG_OP = 'UPDATE') THEN
        v_action_type := 'UPDATE';
        v_old_value := to_jsonb(OLD);
        v_new_value := to_jsonb(NEW);
        v_tags := ARRAY['financial', 'sales'];

        -- Detectar cambios sospechosos
        IF (OLD.monto_total != NEW.monto_total) THEN
            v_description := 'Precio modificado: ' || OLD.monto_total || ' ' || OLD.moneda || ' → ' || NEW.monto_total || ' ' || NEW.moneda;
            v_severity := 'warning';

            -- Marcar como sospechoso si el cambio es >50%
            IF (ABS(NEW.monto_total - OLD.monto_total) / OLD.monto_total > 0.5) THEN
                v_is_suspicious := true;
                v_severity := 'critical';
                v_tags := array_append(v_tags, 'suspicious');
            ELSE
                v_is_suspicious := false;
            END IF;

        ELSIF (OLD.estado != NEW.estado) THEN
            v_description := 'Estado cambiado: ' || OLD.estado || ' → ' || NEW.estado;
            v_severity := 'info';
            v_is_suspicious := false;

            -- Si cambió a "cancelada" o "reembolsada", severity = warning
            IF (NEW.estado IN ('cancelada', 'reembolsada')) THEN
                v_severity := 'warning';
            END IF;

        ELSE
            v_description := 'Venta modificada: ' || NEW.id::TEXT;
            v_severity := 'info';
            v_is_suspicious := false;
        END IF;

    ELSIF (TG_OP = 'DELETE') THEN
        v_action_type := 'DELETE';
        v_description := 'Venta eliminada: ' || OLD.cliente_nombre || ' - ' || OLD.destino || ' (' || OLD.monto_total || ' ' || OLD.moneda || ')';
        v_old_value := to_jsonb(OLD);
        v_new_value := NULL;
        v_severity := 'critical';  -- Borrar ventas es crítico
        v_tags := ARRAY['financial', 'sales', 'deletion'];
        v_is_suspicious := true;  -- Siempre sospechoso
    END IF;

    -- Insertar log usando la función segura
    PERFORM insert_security_log(
        p_agencia_id := COALESCE(NEW.agencia_id, OLD.agencia_id),
        p_user_id := NULL,  -- TODO: Obtener del contexto de sesión
        p_user_email := NULL,
        p_user_ip_address := NULL,
        p_user_agent := NULL,
        p_action_type := v_action_type,
        p_resource_type := 'ventas',
        p_resource_id := COALESCE(NEW.id, OLD.id),
        p_action_description := v_description,
        p_old_value := v_old_value,
        p_new_value := v_new_value,
        p_severity := v_severity,
        p_tags := v_tags,
        p_is_suspicious := v_is_suspicious
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Aplicar trigger a la tabla ventas
CREATE TRIGGER ventas_audit_log
    AFTER INSERT OR UPDATE OR DELETE ON ventas
    FOR EACH ROW
    EXECUTE FUNCTION log_ventas_changes();

-- =====================================================================
-- PASO 6: PREVENIR MODIFICACIÓN/ELIMINACIÓN DE LOGS
-- =====================================================================

-- Crear función que bloquea UPDATE/DELETE
CREATE OR REPLACE FUNCTION prevent_log_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Los logs de auditoría son INMUTABLES. No se permiten modificaciones ni eliminaciones.'
        USING ERRCODE = 'integrity_constraint_violation';
END;
$$;

-- Aplicar trigger para bloquear UPDATE/DELETE
CREATE TRIGGER prevent_security_logs_modification
    BEFORE UPDATE OR DELETE ON security_logs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_log_modification();

-- =====================================================================
-- PASO 7: FUNCIÓN PARA VERIFICAR INTEGRIDAD DE LOGS
-- =====================================================================

CREATE OR REPLACE FUNCTION verify_log_integrity(p_log_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log RECORD;
    v_calculated_hash VARCHAR(64);
    v_hash_input TEXT;
BEGIN
    -- Obtener el log
    SELECT * INTO v_log FROM security_logs WHERE id = p_log_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Log no encontrado: %', p_log_id;
    END IF;

    -- Recalcular hash
    v_hash_input := CONCAT(
        v_log.id::TEXT,
        v_log.agencia_id::TEXT,
        COALESCE(v_log.user_id::TEXT, ''),
        COALESCE(v_log.user_email, ''),
        COALESCE(HOST(v_log.user_ip_address), ''),
        v_log.action_type,
        v_log.resource_type,
        COALESCE(v_log.resource_id::TEXT, ''),
        v_log.action_description,
        COALESCE(v_log.old_value::TEXT, ''),
        COALESCE(v_log.new_value::TEXT, ''),
        v_log.created_at::TEXT
    );

    v_calculated_hash := encode(digest(v_hash_input, 'sha256'), 'hex');

    -- Comparar con hash almacenado
    RETURN (v_calculated_hash = v_log.integrity_hash);
END;
$$;

-- =====================================================================
-- PASO 8: VISTA PARA ALERTAS DE SEGURIDAD
-- =====================================================================

CREATE OR REPLACE VIEW security_alerts AS
SELECT
    sl.id,
    a.nombre AS agencia_nombre,
    sl.severity,
    sl.action_type,
    sl.resource_type,
    sl.action_description,
    sl.user_email,
    sl.user_ip_address,
    sl.created_at,
    sl.old_value,
    sl.new_value,
    sl.tags
FROM security_logs sl
JOIN agencias a ON sl.agencia_id = a.id
WHERE sl.is_suspicious = true OR sl.requires_review = true
ORDER BY sl.created_at DESC;

-- Aplicar RLS a la vista también
ALTER VIEW security_alerts SET (security_barrier = true);

-- =====================================================================
-- PASO 9: DATOS DE PRUEBA
-- =====================================================================

-- Simular cambio de precio sospechoso
SET LOCAL app.current_tenant_id = '550e8400-e29b-41d4-a716-446655440000';

-- Obtener una venta de prueba
DO $$
DECLARE
    v_venta_id UUID;
BEGIN
    SELECT id INTO v_venta_id FROM ventas WHERE agencia_id = '550e8400-e29b-41d4-a716-446655440000' LIMIT 1;

    -- Simular cambio de precio normal (30%)
    UPDATE ventas
    SET monto_total = monto_total * 1.3
    WHERE id = v_venta_id;

    -- Simular cambio de precio sospechoso (70%)
    UPDATE ventas
    SET monto_total = monto_total * 1.7
    WHERE id = v_venta_id;
END $$;

-- Ver los logs generados
SELECT
    id,
    action_type,
    action_description,
    severity,
    is_suspicious,
    created_at
FROM security_logs
ORDER BY created_at DESC
LIMIT 5;

-- Ver alertas de seguridad
SELECT * FROM security_alerts LIMIT 5;

-- =====================================================================
-- PASO 10: FUNCIÓN PARA EXPORTAR LOGS (COMPLIANCE)
-- =====================================================================

CREATE OR REPLACE FUNCTION export_audit_logs(
    p_agencia_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
) RETURNS TABLE (
    log_id UUID,
    fecha TIMESTAMPTZ,
    usuario VARCHAR,
    accion VARCHAR,
    recurso VARCHAR,
    descripcion TEXT,
    valor_anterior JSONB,
    valor_nuevo JSONB,
    severidad VARCHAR,
    etiquetas TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sl.id,
        sl.created_at,
        COALESCE(sl.user_email, 'Sistema'),
        sl.action_type,
        sl.resource_type,
        sl.action_description,
        sl.old_value,
        sl.new_value,
        sl.severity,
        sl.tags
    FROM security_logs sl
    WHERE sl.agencia_id = p_agencia_id
      AND sl.created_at BETWEEN p_start_date AND p_end_date
    ORDER BY sl.created_at DESC;
END;
$$;

-- Ejemplo de uso (exportar logs del último mes)
-- SELECT * FROM export_audit_logs(
--     '550e8400-e29b-41d4-a716-446655440000',
--     NOW() - INTERVAL '30 days',
--     NOW()
-- );

-- =====================================================================
-- PASO 11: AUTOMATIZACIÓN DE RETENCIÓN (OPCIONAL)
-- =====================================================================

-- Crear tabla de logs archivados (para compliance de largo plazo)
CREATE TABLE security_logs_archive (
    LIKE security_logs INCLUDING ALL
);

-- Función para archivar logs antiguos (ejecutar mensualmente)
CREATE OR REPLACE FUNCTION archive_old_logs(p_retention_months INTEGER DEFAULT 12)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_archived_count INTEGER;
BEGIN
    -- Mover logs de más de X meses a la tabla de archivo
    WITH moved_logs AS (
        DELETE FROM security_logs
        WHERE created_at < NOW() - (p_retention_months || ' months')::INTERVAL
        RETURNING *
    )
    INSERT INTO security_logs_archive
    SELECT * FROM moved_logs;

    GET DIAGNOSTICS v_archived_count = ROW_COUNT;

    RETURN v_archived_count;
END;
$$;

-- ⚠️ IMPORTANTE: Ejecutar con cron job mensual
-- SELECT archive_old_logs(12); -- Archivar logs de más de 12 meses

-- =====================================================================
-- CHECKLIST DE MONITOREO Y ALERTAS
-- =====================================================================

-- [ ] Configurar alertas para is_suspicious = true en logs
-- [ ] Monitorear intentos de modificación/eliminación de logs (triggers)
-- [ ] Revisar diariamente security_alerts view
-- [ ] Ejecutar verify_log_integrity() semanalmente en muestra aleatoria
-- [ ] Configurar exportación automática mensual para compliance
-- [ ] Implementar dashboard de Grafana/Metabase para visualización
-- [ ] Configurar SIEM (Security Information and Event Management)
-- [ ] Establecer SLA de revisión de logs críticos (< 24 horas)

-- =====================================================================
-- NOTAS DE COMPLIANCE
-- =====================================================================

/*
CUMPLIMIENTO REGULATORIO:

1. GDPR (Europeo):
   - Right to be forgotten: Los logs NO se pueden eliminar, pero se pueden
     anonimizar (cambiar user_email por hash)

2. PDPA (Argentina - Protección de Datos Personales):
   - Retención máxima: 10 años para datos financieros
   - Implementar anonimización después de cancelación de cuenta

3. PCI-DSS (Payment Card Industry):
   - Logs de transacciones financieras: Retención mínima 1 año
   - Logs de acceso a datos de tarjetas: Retención mínima 3 meses

4. SOC 2 Type II (para SaaS):
   - Auditoría de cambios críticos: Obligatorio
   - Inmutabilidad de logs: Obligatorio
   - Control de acceso a logs: Obligatorio

RECOMENDACIONES:
- Exportar logs mensualmente a S3/Azure Blob Storage encriptado
- Implementar log forwarding a SIEM externo (Splunk, ELK, Datadog)
- Configurar log rotation para evitar crecimiento infinito
- Implementar compression automático para logs archivados
*/
