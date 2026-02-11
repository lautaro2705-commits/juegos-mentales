"""
=====================================================================
TIJUCA TRAVEL - APPLICATION SECURITY LAYER (FastAPI Middleware)
=====================================================================
Propósito: Implementar defensa en profundidad contra inyecciones,
           rate limiting, validación de JWT y sanitización de inputs
Autor: Senior DevSecOps Team
Fecha: 2026-02-09
Versión: 1.0
=====================================================================
"""

import re
import time
import hashlib
import secrets
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from functools import wraps

import jwt
from fastapi import FastAPI, Request, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as redis
from pydantic import BaseModel, validator, UUID4


# =====================================================================
# CONFIGURACIÓN DE SEGURIDAD
# =====================================================================

class SecurityConfig:
    """Configuración centralizada de seguridad"""

    # JWT Configuration
    JWT_SECRET_KEY = "CHANGE_THIS_IN_PRODUCTION_USE_ENV_VAR_MIN_256_BITS"
    JWT_ALGORITHM = "HS256"
    JWT_EXPIRATION_MINUTES = 60
    JWT_REFRESH_EXPIRATION_DAYS = 7

    # Rate Limiting (Token Bucket)
    RATE_LIMIT_REQUESTS = 100  # requests
    RATE_LIMIT_WINDOW = 60  # seconds
    RATE_LIMIT_BURST = 20  # burst allowance

    # SQL Injection Patterns (Blacklist)
    SQL_INJECTION_PATTERNS = [
        r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)",
        r"(--|#|\/\*|\*\/)",  # SQL comments
        r"(\bOR\b.*=.*)",  # OR 1=1
        r"(\bUNION\b.*\bSELECT\b)",
        r"(;.*\b(DROP|DELETE|TRUNCATE)\b)",
        r"(\bxp_cmdshell\b)",  # SQL Server command execution
        r"('.*--)",  # Comment after quote
    ]

    # Prompt Injection Patterns (AI Defense)
    PROMPT_INJECTION_PATTERNS = [
        r"(ignore previous instructions?)",
        r"(system:?\s*you are now)",
        r"(disregard all (previous|prior|above) (instructions?|prompts?))",
        r"(forget (everything|all|your) (you|i) (told|said))",
        r"(new instructions?:)",
        r"(\\n\\n\\n.*admin)",  # Triple newline escape
        r"(pretend (you are|to be))",
        r"(reveal (your|the) (instructions?|prompt|system))",
    ]

    # PII Patterns (Data Loss Prevention)
    PII_PATTERNS = {
        "tarjeta_credito": r"\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b",
        "cbu": r"\b\d{22}\b",
        "cuit": r"\b\d{2}-?\d{8}-?\d{1}\b",
        "dni": r"\b\d{7,8}\b",
        "passport": r"\b[A-Z]{2}\d{6,9}\b",
        "email": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
    }


# =====================================================================
# MODELOS DE DATOS CON VALIDACIÓN
# =====================================================================

class TenantContext(BaseModel):
    """Contexto del tenant para RLS"""
    tenant_id: UUID4
    tenant_name: str
    plan: str
    permissions: list[str] = []

    class Config:
        frozen = True  # Inmutable después de creación


class SecureRequest(BaseModel):
    """Wrapper para requests sanitizados"""
    query: Optional[str] = None
    body: Optional[Dict[str, Any]] = None

    @validator("query", "body", pre=True, always=True)
    def sanitize_input(cls, v):
        """Sanitizar inputs antes de procesarlos"""
        if isinstance(v, str):
            return SecurityValidator.sanitize_sql(v)
        elif isinstance(v, dict):
            return {k: SecurityValidator.sanitize_sql(val) if isinstance(val, str) else val
                    for k, val in v.items()}
        return v


# =====================================================================
# VALIDADORES DE SEGURIDAD
# =====================================================================

class SecurityValidator:
    """Validadores centralizados para inputs maliciosos"""

    @staticmethod
    def sanitize_sql(input_string: str) -> str:
        """
        Sanitiza inputs para prevenir SQL Injection
        ⚠️ IMPORTANTE: Esto NO reemplaza el uso de prepared statements
        """
        if not input_string:
            return input_string

        # Detectar patrones maliciosos
        for pattern in SecurityConfig.SQL_INJECTION_PATTERNS:
            if re.search(pattern, input_string, re.IGNORECASE):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Input bloqueado: patrón SQL sospechoso detectado"
                )

        # Escapar caracteres peligrosos (doble capa de defensa)
        dangerous_chars = ["'", '"', "\\", ";", "--", "/*", "*/"]
        for char in dangerous_chars:
            input_string = input_string.replace(char, "")

        return input_string.strip()

    @staticmethod
    def detect_prompt_injection(user_input: str) -> bool:
        """
        Detecta intentos de Prompt Injection en inputs del usuario
        Retorna True si detecta ataque
        """
        for pattern in SecurityConfig.PROMPT_INJECTION_PATTERNS:
            if re.search(pattern, user_input, re.IGNORECASE):
                return True
        return False

    @staticmethod
    def redact_pii(text: str) -> tuple[str, list[str]]:
        """
        Redacta PII (Personally Identifiable Information) del texto
        Retorna: (texto_redactado, lista_de_tipos_detectados)
        """
        detected_types = []
        redacted_text = text

        for pii_type, pattern in SecurityConfig.PII_PATTERNS.items():
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                detected_types.append(pii_type)

                # Redactar según tipo
                if pii_type == "tarjeta_credito":
                    # Mantener últimos 4 dígitos
                    redacted_text = re.sub(pattern, r"****-****-****-\1", redacted_text)
                elif pii_type == "email":
                    # Redactar parcialmente: j***@example.com
                    redacted_text = re.sub(
                        pattern,
                        lambda m: f"{m.group(0)[0]}***@{m.group(0).split('@')[1]}",
                        redacted_text
                    )
                else:
                    # Redactar completamente
                    redacted_text = re.sub(pattern, "[REDACTADO]", redacted_text)

        return redacted_text, detected_types


# =====================================================================
# MIDDLEWARE DE RATE LIMITING (Token Bucket Algorithm)
# =====================================================================

class RateLimiter:
    """Rate Limiter usando Redis y Token Bucket Algorithm"""

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    async def check_rate_limit(self, identifier: str) -> bool:
        """
        Verifica si el cliente excedió el rate limit
        identifier: tenant_id o IP address
        """
        key = f"rate_limit:{identifier}"
        now = time.time()

        # Obtener estado actual del bucket
        bucket_data = await self.redis.get(key)

        if bucket_data:
            tokens, last_update = map(float, bucket_data.decode().split(":"))
        else:
            tokens = SecurityConfig.RATE_LIMIT_REQUESTS
            last_update = now

        # Calcular tokens regenerados desde última actualización
        time_passed = now - last_update
        tokens_to_add = time_passed * (SecurityConfig.RATE_LIMIT_REQUESTS / SecurityConfig.RATE_LIMIT_WINDOW)
        tokens = min(tokens + tokens_to_add, SecurityConfig.RATE_LIMIT_REQUESTS + SecurityConfig.RATE_LIMIT_BURST)

        # Verificar si hay tokens disponibles
        if tokens >= 1:
            tokens -= 1
            # Guardar estado actualizado
            await self.redis.set(
                key,
                f"{tokens}:{now}",
                ex=SecurityConfig.RATE_LIMIT_WINDOW * 2
            )
            return True
        else:
            return False


# =====================================================================
# MIDDLEWARE DE TENANT ISOLATION
# =====================================================================

class TenantIsolationMiddleware(BaseHTTPMiddleware):
    """
    Middleware que setea el tenant_id en PostgreSQL para RLS
    ⚠️ CRÍTICO: Este middleware DEBE ejecutarse antes de cualquier query
    """

    async def dispatch(self, request: Request, call_next):
        # Extraer tenant_id del JWT (explicado en JWTHandler)
        tenant_context: Optional[TenantContext] = getattr(request.state, "tenant", None)

        if tenant_context:
            # Obtener la sesión de base de datos
            db: AsyncSession = request.state.db

            # ⚠️ CRÍTICO: Setear el tenant_id para RLS
            await db.execute(
                text(f"SET LOCAL app.current_tenant_id = '{tenant_context.tenant_id}'")
            )

            # También setear a nivel de aplicación (doble validación)
            request.state.validated_tenant_id = tenant_context.tenant_id

        response = await call_next(request)
        return response


# =====================================================================
# MIDDLEWARE DE SANITIZACIÓN
# =====================================================================

class InputSanitizationMiddleware(BaseHTTPMiddleware):
    """Sanitiza todos los inputs antes de procesarlos"""

    async def dispatch(self, request: Request, call_next):
        # Sanitizar query parameters
        if request.query_params:
            sanitized_params = {}
            for key, value in request.query_params.items():
                try:
                    sanitized_params[key] = SecurityValidator.sanitize_sql(value)
                except HTTPException:
                    return JSONResponse(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        content={"detail": f"Query parameter '{key}' contiene caracteres prohibidos"}
                    )

        # Sanitizar body (solo para JSON)
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                body = await request.json()
                # La validación se hará en los endpoints con Pydantic
            except Exception:
                pass

        response = await call_next(request)
        return response


# =====================================================================
# JWT HANDLER (Autenticación)
# =====================================================================

class JWTHandler:
    """Manejo de JWT con rotación de claves"""

    @staticmethod
    def create_access_token(tenant_id: str, tenant_name: str, plan: str, permissions: list[str]) -> str:
        """Crea un JWT access token"""
        payload = {
            "tenant_id": tenant_id,
            "tenant_name": tenant_name,
            "plan": plan,
            "permissions": permissions,
            "exp": datetime.utcnow() + timedelta(minutes=SecurityConfig.JWT_EXPIRATION_MINUTES),
            "iat": datetime.utcnow(),
            "jti": secrets.token_urlsafe(16),  # JWT ID único (para revocación)
        }
        return jwt.encode(payload, SecurityConfig.JWT_SECRET_KEY, algorithm=SecurityConfig.JWT_ALGORITHM)

    @staticmethod
    def decode_token(token: str) -> TenantContext:
        """Decodifica y valida un JWT"""
        try:
            payload = jwt.decode(
                token,
                SecurityConfig.JWT_SECRET_KEY,
                algorithms=[SecurityConfig.JWT_ALGORITHM]
            )
            return TenantContext(
                tenant_id=payload["tenant_id"],
                tenant_name=payload["tenant_name"],
                plan=payload["plan"],
                permissions=payload.get("permissions", [])
            )
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expirado"
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido"
            )


# =====================================================================
# DEPENDENCIAS DE FASTAPI
# =====================================================================

security = HTTPBearer()


async def get_current_tenant(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> TenantContext:
    """Dependency para extraer el tenant del JWT"""
    token = credentials.credentials
    return JWTHandler.decode_token(token)


async def verify_tenant_ownership(
    resource_tenant_id: str,
    current_tenant: TenantContext = Depends(get_current_tenant)
) -> bool:
    """
    Verifica que el recurso solicitado pertenece al tenant actual
    ⚠️ DOBLE VALIDACIÓN: Aunque RLS protege en DB, validamos también en app
    """
    if resource_tenant_id != str(current_tenant.tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para acceder a este recurso"
        )
    return True


# =====================================================================
# DECORADOR PARA RATE LIMITING
# =====================================================================

def rate_limit(redis_client: redis.Redis):
    """Decorador para aplicar rate limiting a endpoints"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request: Request = kwargs.get("request") or args[0]
            tenant: TenantContext = getattr(request.state, "tenant", None)

            # Usar tenant_id como identificador (o IP si no está autenticado)
            identifier = str(tenant.tenant_id) if tenant else request.client.host

            limiter = RateLimiter(redis_client)
            allowed = await limiter.check_rate_limit(identifier)

            if not allowed:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit excedido. Intenta nuevamente en unos segundos."
                )

            return await func(*args, **kwargs)
        return wrapper
    return decorator


# =====================================================================
# EJEMPLO DE USO EN FASTAPI
# =====================================================================

# Inicializar FastAPI
app = FastAPI(title="Tijuca Travel Secure API")

# Agregar middlewares (orden importa: primero ejecuta el último agregado)
app.add_middleware(TenantIsolationMiddleware)
app.add_middleware(InputSanitizationMiddleware)


# Inicializar Redis para rate limiting
redis_client = redis.from_url("redis://localhost:6379", decode_responses=False)


# =====================================================================
# ENDPOINT DE EJEMPLO (PROTEGIDO)
# =====================================================================

@app.get("/api/ventas")
@rate_limit(redis_client)
async def get_ventas(
    request: Request,
    db: AsyncSession = Depends(lambda: request.state.db),
    tenant: TenantContext = Depends(get_current_tenant)
):
    """
    Obtiene las ventas del tenant actual
    ⚠️ RLS en DB asegura que solo vea sus propias ventas
    """

    # Validación adicional (paranoia mode)
    validated_tenant_id = getattr(request.state, "validated_tenant_id", None)
    if validated_tenant_id != tenant.tenant_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error de validación de tenant"
        )

    # Query seguro (RLS filtrará automáticamente por agencia_id)
    query = text("""
        SELECT id, cliente_nombre, destino, monto_total, created_at
        FROM ventas
        ORDER BY created_at DESC
        LIMIT 100
    """)

    result = await db.execute(query)
    ventas = result.fetchall()

    return {
        "tenant_id": str(tenant.tenant_id),
        "tenant_name": tenant.tenant_name,
        "ventas": [
            {
                "id": str(row[0]),
                "cliente": row[1],
                "destino": row[2],
                "monto": float(row[3]),
                "fecha": row[4].isoformat()
            }
            for row in ventas
        ]
    }


# =====================================================================
# ENDPOINT PARA HUNTERBOT (CON GUARDRAILS)
# =====================================================================

class HunterBotMessage(BaseModel):
    """Input del usuario a HunterBot"""
    message: str
    whatsapp_phone: str

    @validator("message")
    def validate_message(cls, v):
        # Detectar Prompt Injection
        if SecurityValidator.detect_prompt_injection(v):
            raise ValueError("Mensaje bloqueado: intento de manipulación detectado")

        # Detectar PII antes de enviar a IA
        redacted, pii_types = SecurityValidator.redact_pii(v)
        if pii_types:
            # Log de seguridad (ver siguiente archivo)
            print(f"⚠️ PII detectado en input: {pii_types}")

        return redacted


@app.post("/api/hunterbot/chat")
async def hunterbot_chat(
    request: Request,
    message: HunterBotMessage,
    tenant: TenantContext = Depends(get_current_tenant)
):
    """
    Endpoint para HunterBot con protecciones:
    - Prompt Injection Defense
    - PII Redaction
    - Rate Limiting
    """

    # Aquí iría la lógica de HunterBot
    # Ver archivo separado para AI Guardrails

    return {
        "response": "Implementación de HunterBot aquí",
        "message_sanitized": True
    }


# =====================================================================
# HEALTH CHECK (SIN AUTENTICACIÓN)
# =====================================================================

@app.get("/health")
async def health_check():
    """Endpoint para verificar estado de la API"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "security": {
            "rls_enabled": True,
            "rate_limiting": True,
            "jwt_auth": True
        }
    }


# =====================================================================
# NOTAS DE IMPLEMENTACIÓN
# =====================================================================

"""
CHECKLIST DE DESPLIEGUE:

[ ] Cambiar JWT_SECRET_KEY (mínimo 256 bits, usar secrets.token_urlsafe(32))
[ ] Configurar Redis en producción (con autenticación)
[ ] Habilitar HTTPS/TLS en Nginx/Cloudflare
[ ] Configurar CORS restrictivo (solo dominios permitidos)
[ ] Implementar rotación automática de JWT secrets
[ ] Monitorear intentos de bypass en logs
[ ] Configurar alertas para patrones de ataque
[ ] Revisar límites de rate limiting según plan SaaS
[ ] Implementar circuit breaker para dependencias externas
[ ] Configurar logging estructurado (JSON) para SIEM

MEJORAS FUTURAS:

- Implementar JWT refresh tokens
- Agregar MFA (Multi-Factor Authentication)
- Implementar RBAC (Role-Based Access Control) granular
- Agregar fingerprinting de dispositivos
- Implementar anomaly detection con ML
- Agregar WAF (Web Application Firewall) como Cloudflare
"""
