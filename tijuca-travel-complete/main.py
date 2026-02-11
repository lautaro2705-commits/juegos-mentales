"""
=====================================================================
TIJUCA TRAVEL - APLICACIÓN PRINCIPAL
=====================================================================
SaaS B2B Multi-Tenant para Agencias de Turismo

Arquitectura de Seguridad:
- Capa 1: Row Level Security (PostgreSQL)
- Capa 2: Application Middleware (FastAPI)
- Capa 3: AI Guardrails (HunterBot)

Ejecutar con:
    uvicorn main:app --reload --port 8000
=====================================================================
"""

import os
from fastapi import FastAPI, Depends, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import redis.asyncio as redis
from datetime import datetime
import bcrypt

# Configuración
from config import settings

# Database
from app.core.database import get_db, set_tenant_context

# Middleware de seguridad
from app.middleware.security import (
    TenantIsolationMiddleware,
    InputSanitizationMiddleware,
    JWTHandler,
    get_current_tenant,
    TenantContext,
    rate_limit
)

# Modelos
from app.models.agencia import Agencia
from app.models.venta import Venta

# Schemas
from pydantic import BaseModel, EmailStr, UUID4


# =====================================================================
# INICIALIZACIÓN DE FASTAPI
# =====================================================================

app = FastAPI(
    title="Tijuca Travel API",
    description="SaaS B2B Multi-Tenant para Agencias de Turismo",
    version="1.0.0",
    docs_url="/api/docs" if settings.DEBUG else None,  # Ocultar docs en prod
    redoc_url="/api/redoc" if settings.DEBUG else None
)

# =====================================================================
# CORS
# =====================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================================
# MIDDLEWARE DE SEGURIDAD
# =====================================================================

# Agregar middlewares (orden importa: último agregado se ejecuta primero)
app.add_middleware(TenantIsolationMiddleware)
app.add_middleware(InputSanitizationMiddleware)


# =====================================================================
# MIDDLEWARE PARA DB SESSION
# =====================================================================

@app.middleware("http")
async def db_session_middleware(request: Request, call_next):
    """Inyecta la sesión de DB en request.state"""
    from app.core.database import async_session_maker

    async with async_session_maker() as session:
        request.state.db = session
        response = await call_next(request)
    return response


# =====================================================================
# REDIS CLIENT (RATE LIMITING)
# =====================================================================

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=False)


# =====================================================================
# SCHEMAS (PYDANTIC MODELS)
# =====================================================================

class LoginRequest(BaseModel):
    """Request para login"""
    api_key: str


class LoginResponse(BaseModel):
    """Response de login"""
    access_token: str
    token_type: str
    tenant_id: str
    tenant_name: str
    plan: str


class VentaResponse(BaseModel):
    """Response de venta"""
    id: UUID4
    cliente_nombre: str
    destino: str | None
    monto_total: float
    moneda: str
    estado: str
    created_at: datetime

    class Config:
        from_attributes = True


class CreateVentaRequest(BaseModel):
    """Request para crear venta"""
    cliente_nombre: str
    cliente_email: EmailStr | None = None
    cliente_telefono: str | None = None
    descripcion: str
    destino: str | None = None
    moneda: str
    monto_base: float
    impuesto_pais: float = 0
    percepcion_ganancias: float = 0
    percepcion_iibb: float = 0


# =====================================================================
# ENDPOINTS - HEALTH CHECK
# =====================================================================

@app.get("/health")
async def health_check():
    """
    Health check (sin autenticación)
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": settings.ENVIRONMENT,
        "security": {
            "rls_enabled": True,
            "jwt_auth": True,
            "rate_limiting": True,
            "ai_guardrails": bool(settings.ANTHROPIC_API_KEY)
        }
    }


# =====================================================================
# ENDPOINTS - AUTENTICACIÓN
# =====================================================================

@app.post("/api/auth/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Login con API key

    Retorna JWT token para autenticación en endpoints protegidos
    """
    # Buscar agencia por API key
    result = await db.execute(
        text("""
            SELECT id, nombre, plan, api_key_hash
            FROM agencias
            WHERE activa = true
        """)
    )
    agencias = result.fetchall()

    # Verificar API key
    for agencia in agencias:
        agencia_id, nombre, plan, api_key_hash = agencia

        # Comparar hash
        if bcrypt.checkpw(request.api_key.encode(), api_key_hash.encode()):
            # Generar JWT
            token = JWTHandler.create_access_token(
                tenant_id=str(agencia_id),
                tenant_name=nombre,
                plan=plan,
                permissions=["read", "write", "delete"]
            )

            return LoginResponse(
                access_token=token,
                token_type="bearer",
                tenant_id=str(agencia_id),
                tenant_name=nombre,
                plan=plan
            )

    # API key inválido
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="API key inválido"
    )


# =====================================================================
# ENDPOINTS - VENTAS (PROTEGIDOS CON JWT + RLS)
# =====================================================================

@app.get("/api/ventas", response_model=list[VentaResponse])
@rate_limit(redis_client)
async def get_ventas(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant)
):
    """
    Obtiene las ventas del tenant actual

    ⚠️ RLS en DB asegura que solo vea sus propias ventas
    """
    # Setear contexto de tenant para RLS
    await set_tenant_context(db, str(tenant.tenant_id))

    # Query seguro (RLS filtrará automáticamente)
    query = text("""
        SELECT
            id, cliente_nombre, destino,
            monto_total, moneda, estado, created_at
        FROM ventas
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :skip
    """)

    result = await db.execute(query, {"limit": limit, "skip": skip})
    ventas = result.fetchall()

    return [
        VentaResponse(
            id=row[0],
            cliente_nombre=row[1],
            destino=row[2],
            monto_total=float(row[3]),
            moneda=row[4],
            estado=row[5],
            created_at=row[6]
        )
        for row in ventas
    ]


@app.post("/api/ventas", response_model=VentaResponse, status_code=status.HTTP_201_CREATED)
@rate_limit(redis_client)
async def create_venta(
    request: Request,
    venta_data: CreateVentaRequest,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant)
):
    """
    Crea una nueva venta

    ⚠️ RLS asegura que solo se cree para el tenant actual
    """
    # Setear contexto de tenant para RLS
    await set_tenant_context(db, str(tenant.tenant_id))

    # Calcular monto total
    monto_total = (
        venta_data.monto_base +
        venta_data.impuesto_pais +
        venta_data.percepcion_ganancias +
        venta_data.percepcion_iibb
    )

    # Insertar venta
    query = text("""
        INSERT INTO ventas (
            agencia_id, cliente_nombre, cliente_email, cliente_telefono,
            descripcion, destino, moneda, monto_base,
            impuesto_pais, percepcion_ganancias, percepcion_iibb, monto_total
        ) VALUES (
            :agencia_id, :cliente_nombre, :cliente_email, :cliente_telefono,
            :descripcion, :destino, :moneda, :monto_base,
            :impuesto_pais, :percepcion_ganancias, :percepcion_iibb, :monto_total
        ) RETURNING id, cliente_nombre, destino, monto_total, moneda, estado, created_at
    """)

    result = await db.execute(
        query,
        {
            "agencia_id": str(tenant.tenant_id),
            "cliente_nombre": venta_data.cliente_nombre,
            "cliente_email": venta_data.cliente_email,
            "cliente_telefono": venta_data.cliente_telefono,
            "descripcion": venta_data.descripcion,
            "destino": venta_data.destino,
            "moneda": venta_data.moneda,
            "monto_base": venta_data.monto_base,
            "impuesto_pais": venta_data.impuesto_pais,
            "percepcion_ganancias": venta_data.percepcion_ganancias,
            "percepcion_iibb": venta_data.percepcion_iibb,
            "monto_total": monto_total
        }
    )
    await db.commit()

    row = result.fetchone()

    return VentaResponse(
        id=row[0],
        cliente_nombre=row[1],
        destino=row[2],
        monto_total=float(row[3]),
        moneda=row[4],
        estado=row[5],
        created_at=row[6]
    )


@app.get("/api/ventas/{venta_id}", response_model=VentaResponse)
@rate_limit(redis_client)
async def get_venta(
    request: Request,
    venta_id: UUID4,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant)
):
    """
    Obtiene una venta específica

    ⚠️ RLS asegura que solo vea sus propias ventas
    """
    # Setear contexto de tenant para RLS
    await set_tenant_context(db, str(tenant.tenant_id))

    query = text("""
        SELECT
            id, cliente_nombre, destino,
            monto_total, moneda, estado, created_at
        FROM ventas
        WHERE id = :venta_id
    """)

    result = await db.execute(query, {"venta_id": str(venta_id)})
    row = result.fetchone()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Venta no encontrada"
        )

    return VentaResponse(
        id=row[0],
        cliente_nombre=row[1],
        destino=row[2],
        monto_total=float(row[3]),
        moneda=row[4],
        estado=row[5],
        created_at=row[6]
    )


# =====================================================================
# ENDPOINTS - HUNTERBOT (AI AGENT)
# =====================================================================

class HunterBotMessage(BaseModel):
    """Request para HunterBot"""
    message: str
    whatsapp_phone: str


@app.post("/api/hunterbot/chat")
@rate_limit(redis_client)
async def hunterbot_chat(
    request: Request,
    message: HunterBotMessage,
    db: AsyncSession = Depends(get_db),
    tenant: TenantContext = Depends(get_current_tenant)
):
    """
    Chat con HunterBot (AI Agent con guardrails de seguridad)

    Protecciones:
    - Prompt Injection Defense
    - PII Redaction
    - Hallucination Prevention
    """
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="HunterBot no está configurado (falta ANTHROPIC_API_KEY)"
        )

    from anthropic import Anthropic
    from app.services.ai_guardrails import SecureHunterBot

    # Setear contexto de tenant
    await set_tenant_context(db, str(tenant.tenant_id))

    # Inicializar HunterBot seguro
    anthropic_client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    bot = SecureHunterBot(db, anthropic_client, str(tenant.tenant_id))

    # Procesar mensaje con todas las capas de seguridad
    result = await bot.process_message(message.message)

    return result


# =====================================================================
# EXCEPTION HANDLERS
# =====================================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handler para excepciones HTTP"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "timestamp": datetime.utcnow().isoformat()
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handler para excepciones generales"""
    if settings.DEBUG:
        import traceback
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": str(exc),
                "traceback": traceback.format_exc(),
                "timestamp": datetime.utcnow().isoformat()
            }
        )
    else:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "detail": "Error interno del servidor",
                "timestamp": datetime.utcnow().isoformat()
            }
        )


# =====================================================================
# STARTUP/SHUTDOWN
# =====================================================================

@app.on_event("startup")
async def startup_event():
    """Tareas al iniciar la aplicación"""
    print("🚀 Tijuca Travel API iniciando...")
    print(f"   Ambiente: {settings.ENVIRONMENT}")
    print(f"   Debug: {settings.DEBUG}")
    print(f"   RLS: ✅ Habilitado")
    print(f"   Rate Limiting: ✅ Habilitado")
    print(f"   AI Guardrails: {'✅' if settings.ANTHROPIC_API_KEY else '⚠️'} {'Habilitado' if settings.ANTHROPIC_API_KEY else 'Deshabilitado'}")
    print("🛡️ Sistema de seguridad activo\n")


@app.on_event("shutdown")
async def shutdown_event():
    """Tareas al cerrar la aplicación"""
    await redis_client.close()
    print("\n👋 Tijuca Travel API detenido")


# =====================================================================
# MAIN (para ejecutar con python main.py)
# =====================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
