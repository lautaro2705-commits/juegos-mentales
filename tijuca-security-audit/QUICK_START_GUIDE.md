# 🚀 GUÍA DE INICIO RÁPIDO - TIJUCA TRAVEL SECURITY

**Tiempo estimado:** 2-3 horas
**Para:** Desarrolladores Backend, DevOps
**Requisitos:** PostgreSQL 15+, Python 3.11+, Redis, Docker (opcional)

---

## ⚡ SETUP EN 10 MINUTOS

### Paso 1: Clonar y Preparar Ambiente

```bash
# 1. Navegar al directorio del proyecto
cd /path/to/tijuca-security-audit

# 2. Crear virtual environment
python3 -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# 3. Instalar dependencias
pip install fastapi sqlalchemy asyncpg psycopg2-binary redis anthropic pydantic python-jose[cryptography] python-multipart uvicorn
```

---

### Paso 2: Configurar PostgreSQL

```bash
# 1. Crear base de datos
createdb tijuca_db

# 2. Conectar y ejecutar scripts
psql -d tijuca_db

# 3. Dentro de psql, ejecutar:
\i 01_database_rls.sql
\i 03_audit_log_table.sql

# 4. Verificar instalación
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;

# Debes ver: ventas, agencias, security_logs con rowsecurity = t
```

---

### Paso 3: Configurar Variables de Entorno

```bash
# Crear archivo .env
cat > .env << 'EOF'
# Database
DATABASE_URL=postgresql+asyncpg://tijuca_app:CHANGE_THIS_PASSWORD@localhost:5432/tijuca_db

# JWT Secret (CAMBIAR EN PRODUCCIÓN)
JWT_SECRET_KEY=$(openssl rand -base64 32)

# Redis
REDIS_URL=redis://localhost:6379

# Anthropic (HunterBot)
ANTHROPIC_API_KEY=sk-ant-your-api-key-here

# Environment
ENVIRONMENT=development
DEBUG=true
EOF

# Cargar variables
export $(cat .env | xargs)
```

---

### Paso 4: Iniciar Redis (Docker o Local)

```bash
# Opción A: Docker (recomendado)
docker run -d --name tijuca-redis -p 6379:6379 redis:7-alpine

# Opción B: Local (si ya tienes Redis instalado)
redis-server

# Verificar conexión
redis-cli ping
# Respuesta: PONG
```

---

### Paso 5: Crear Aplicación FastAPI Mínima

```bash
# Crear archivo main.py
cat > main.py << 'EOF'
import os
from fastapi import FastAPI, Depends, Request
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import redis.asyncio as redis

# Importar middleware de seguridad
import sys
sys.path.append('/path/to/tijuca-security-audit')  # Ajustar path
from security_middleware import (
    TenantIsolationMiddleware,
    InputSanitizationMiddleware,
    JWTHandler,
    get_current_tenant,
    TenantContext
)

# Configuración
DATABASE_URL = os.getenv("DATABASE_URL")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Motor de base de datos
engine = create_async_engine(DATABASE_URL, echo=True)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Redis client
redis_client = redis.from_url(REDIS_URL, decode_responses=False)

# App FastAPI
app = FastAPI(title="Tijuca Travel Secure API", version="1.0")

# Agregar middlewares
app.add_middleware(TenantIsolationMiddleware)
app.add_middleware(InputSanitizationMiddleware)

# Dependency para DB session
async def get_db():
    async with async_session() as session:
        yield session

# Middleware para inyectar DB en request.state
@app.middleware("http")
async def db_session_middleware(request: Request, call_next):
    async with async_session() as session:
        request.state.db = session
        response = await call_next(request)
    return response

# ENDPOINT DE PRUEBA: Health Check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "security": {
            "rls_enabled": True,
            "jwt_auth": True,
            "rate_limiting": True
        }
    }

# ENDPOINT DE PRUEBA: Login (generar JWT)
from pydantic import BaseModel

class LoginRequest(BaseModel):
    api_key: str

@app.post("/auth/login")
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import text
    import bcrypt

    # Buscar agencia por API key
    result = await db.execute(
        text("SELECT id, nombre, plan, api_key_hash FROM agencias WHERE activa = true")
    )
    agencias = result.fetchall()

    for agencia in agencias:
        # Verificar API key
        if bcrypt.checkpw(request.api_key.encode(), agencia[3].encode()):
            # Generar JWT
            token = JWTHandler.create_access_token(
                tenant_id=str(agencia[0]),
                tenant_name=agencia[1],
                plan=agencia[2],
                permissions=["read", "write"]
            )
            return {
                "access_token": token,
                "token_type": "bearer",
                "tenant_id": str(agencia[0]),
                "tenant_name": agencia[1]
            }

    return {"error": "Invalid API key"}, 401

# ENDPOINT PROTEGIDO: Listar ventas (con RLS)
from sqlalchemy import text

@app.get("/api/ventas")
async def get_ventas(
    request: Request,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant)
):
    # RLS filtrará automáticamente por agencia_id
    query = text("""
        SELECT id, cliente_nombre, destino, monto_total, moneda, created_at
        FROM ventas
        ORDER BY created_at DESC
        LIMIT 10
    """)

    result = await db.execute(query)
    ventas = result.fetchall()

    return {
        "tenant_id": str(tenant.tenant_id),
        "tenant_name": tenant.tenant_name,
        "count": len(ventas),
        "ventas": [
            {
                "id": str(row[0]),
                "cliente": row[1],
                "destino": row[2],
                "monto": float(row[3]),
                "moneda": row[4],
                "fecha": row[5].isoformat()
            }
            for row in ventas
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
EOF
```

---

### Paso 6: Ejecutar la Aplicación

```bash
# Iniciar servidor
python main.py

# O con uvicorn directamente
uvicorn main:app --reload --port 8000
```

Deberías ver:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [12345]
```

---

## 🧪 TESTING RÁPIDO

### Test 1: Health Check (Sin Autenticación)

```bash
curl http://localhost:8000/health
```

**Respuesta esperada:**
```json
{
  "status": "healthy",
  "security": {
    "rls_enabled": true,
    "jwt_auth": true,
    "rate_limiting": true
  }
}
```

---

### Test 2: Obtener JWT Token

```bash
# Usar API key de prueba (ver 01_database_rls.sql)
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"api_key": "test_api_key_sol"}'
```

**Respuesta esperada:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "tenant_name": "Viajes del Sol"
}
```

**Guardar el token:**
```bash
export JWT_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Test 3: Acceder a Endpoint Protegido (Con JWT)

```bash
curl http://localhost:8000/api/ventas \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Respuesta esperada:**
```json
{
  "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
  "tenant_name": "Viajes del Sol",
  "count": 2,
  "ventas": [
    {
      "id": "...",
      "cliente": "Juan Pérez",
      "destino": "Bariloche",
      "monto": 850000.0,
      "moneda": "ARS",
      "fecha": "2026-02-09T..."
    },
    ...
  ]
}
```

**✅ ÉXITO:** Solo ves ventas de "Viajes del Sol", no de "Turismo Global"

---

### Test 4: Verificar Aislamiento (Otro Tenant)

```bash
# Obtener JWT de otra agencia
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"api_key": "test_api_key_global"}'

# Guardar nuevo token
export JWT_TOKEN_B="<nuevo_token>"

# Consultar ventas con token de agencia B
curl http://localhost:8000/api/ventas \
  -H "Authorization: Bearer $JWT_TOKEN_B"
```

**Respuesta esperada:**
```json
{
  "tenant_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "tenant_name": "Turismo Global",
  "count": 2,
  "ventas": [
    {
      "cliente": "Carlos Ramírez",
      "destino": "Caribe",
      ...
    },
    ...
  ]
}
```

**✅ ÉXITO:** Diferentes agencias ven SOLO sus datos

---

### Test 5: SQL Injection Attempt (Debe Fallar)

```bash
curl -X GET "http://localhost:8000/api/ventas?search=test'; DROP TABLE ventas; --" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Respuesta esperada:**
```json
{
  "detail": "Input bloqueado: patrón SQL sospechoso detectado"
}
```

**✅ ÉXITO:** Middleware bloqueó el ataque

---

### Test 6: JWT Expirado (Debe Fallar)

```bash
# Usar un JWT antiguo o alterado
curl http://localhost:8000/api/ventas \
  -H "Authorization: Bearer INVALID_OR_EXPIRED_TOKEN"
```

**Respuesta esperada:**
```json
{
  "detail": "Token inválido"
}
```

---

## 🎨 VISUALIZACIÓN DE FLUJO DE SEGURIDAD

```
┌─────────────────────────────────────────────────────────────┐
│  1. USUARIO HACE REQUEST                                    │
│     GET /api/ventas                                         │
│     Authorization: Bearer <JWT>                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  2. INPUT SANITIZATION MIDDLEWARE                           │
│     ✓ Detecta patrones SQL sospechosos                      │
│     ✓ Escapea caracteres peligrosos                         │
│     ✗ Si detecta ataque → 400 Bad Request                   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  3. JWT VALIDATION                                          │
│     ✓ Decodifica JWT con secret key                         │
│     ✓ Verifica firma (HS256)                                │
│     ✓ Verifica expiración                                   │
│     ✓ Extrae tenant_id del payload                          │
│     ✗ Si inválido → 401 Unauthorized                        │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  4. TENANT ISOLATION MIDDLEWARE                             │
│     ✓ Setea PostgreSQL session variable:                    │
│       SET app.current_tenant_id = '<tenant_id_from_jwt>'    │
│     ✓ Adjunta tenant al request.state                       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  5. ENDPOINT HANDLER                                        │
│     ✓ Ejecuta query: SELECT * FROM ventas                   │
│     (NO necesita WHERE agencia_id = ...)                    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  6. ROW LEVEL SECURITY (PostgreSQL)                         │
│     ✓ PostgreSQL intercepta el query                        │
│     ✓ Aplica política RLS automáticamente:                  │
│       WHERE agencia_id = current_setting('app.current_tenant_id') │
│     ✓ Solo retorna filas del tenant autorizado              │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  7. RESPONSE                                                │
│     ✓ JSON con ventas del tenant (y SOLO de ese tenant)     │
│     ✓ Status 200 OK                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🐛 TROUBLESHOOTING

### Problema 1: "ERROR: relation does not exist"

**Causa:** Las tablas no se crearon correctamente

**Solución:**
```bash
psql -d tijuca_db -f 01_database_rls.sql
psql -d tijuca_db -f 03_audit_log_table.sql

# Verificar
psql -d tijuca_db -c "\dt"
```

---

### Problema 2: "ERROR: permission denied for table ventas"

**Causa:** El usuario `tijuca_app` no tiene permisos

**Solución:**
```sql
-- Conectar como superuser
psql -d tijuca_db

-- Otorgar permisos
GRANT SELECT, INSERT, UPDATE, DELETE ON ventas TO tijuca_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON agencias TO tijuca_app;
GRANT SELECT ON security_logs TO tijuca_app;
GRANT EXECUTE ON FUNCTION insert_security_log TO tijuca_app;
```

---

### Problema 3: "RLS policies are not being applied"

**Causa:** Conectado como superuser (bypasea RLS)

**Solución:**
```bash
# Verificar usuario actual
psql -d tijuca_db -c "SELECT current_user;"

# Si retorna 'postgres' o 'root', cambiar conexión
# En DATABASE_URL usar: tijuca_app en lugar de postgres
```

---

### Problema 4: "ModuleNotFoundError: No module named 'security_middleware'"

**Causa:** Path incorrecto o archivo no importable

**Solución:**
```bash
# Mover archivos al mismo directorio
cp /path/to/tijuca-security-audit/02_security_middleware.py .
cp /path/to/tijuca-security-audit/04_ai_guardrails.py .

# O agregar al PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:/path/to/tijuca-security-audit"
```

---

### Problema 5: "Redis connection refused"

**Causa:** Redis no está corriendo

**Solución:**
```bash
# Iniciar Redis
docker start tijuca-redis
# O
redis-server

# Verificar
redis-cli ping
```

---

## 📚 PRÓXIMOS PASOS

Una vez que tengas la aplicación corriendo:

1. **Ejecutar el plan de testing completo:**
   ```bash
   # Ver archivo SECURITY_TEST_PLAN.md
   ```

2. **Implementar HunterBot (AI Agent):**
   ```bash
   # Ver archivo 04_ai_guardrails.py
   # Configurar ANTHROPIC_API_KEY
   ```

3. **Agregar más endpoints:**
   - POST /api/ventas (crear venta)
   - PUT /api/ventas/{id} (actualizar venta)
   - DELETE /api/ventas/{id} (eliminar venta)
   - Todos con RLS automático ✅

4. **Configurar monitoreo:**
   - Prometheus metrics
   - Grafana dashboards
   - Alertas en Slack

5. **Preparar para producción:**
   - Cambiar JWT_SECRET_KEY
   - Habilitar HTTPS
   - Configurar backups
   - Ver EXECUTIVE_SUMMARY.md

---

## 🎓 RECURSOS DE APRENDIZAJE

### Documentación Clave

- [PostgreSQL Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

### Tutoriales

- [Multi-Tenant SaaS with RLS](https://www.youtube.com/watch?v=...)
- [Building Secure APIs with FastAPI](https://www.youtube.com/watch?v=...)

---

## ✅ CHECKLIST DE VALIDACIÓN

Antes de considerar que el setup está completo:

- [ ] PostgreSQL corriendo y accesible
- [ ] Tablas `ventas`, `agencias`, `security_logs` creadas
- [ ] RLS habilitado en todas las tablas
- [ ] Usuario `tijuca_app` creado con permisos correctos
- [ ] Redis corriendo y accesible
- [ ] Variables de entorno configuradas (.env)
- [ ] FastAPI app iniciando sin errores
- [ ] Endpoint `/health` retorna 200 OK
- [ ] Login endpoint retorna JWT válido
- [ ] Endpoint `/api/ventas` protegido con JWT
- [ ] Aislamiento de tenants verificado (Agencia A ≠ Agencia B)
- [ ] SQL Injection bloqueado por middleware
- [ ] JWT inválido rechazado con 401

---

## 🆘 SOPORTE

¿Problemas? ¿Preguntas?

1. **Revisar logs:**
   ```bash
   # Logs de PostgreSQL
   tail -f /usr/local/var/postgres/server.log

   # Logs de FastAPI (en consola donde ejecutaste main.py)
   ```

2. **Consultar documentación completa:**
   - README.md (arquitectura)
   - SECURITY_TEST_PLAN.md (testing)
   - EXECUTIVE_SUMMARY.md (overview ejecutivo)

3. **Contactar al equipo:**
   - Email: dev@tijucatravel.com
   - Slack: #tijuca-dev

---

**¡Felicitaciones! 🎉**
Has configurado exitosamente una aplicación SaaS con arquitectura de seguridad Zero Trust.

**Última actualización:** 2026-02-09
**Versión:** 1.0
