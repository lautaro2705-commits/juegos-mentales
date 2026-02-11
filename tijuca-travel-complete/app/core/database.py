"""
Configuración de la base de datos con SQLAlchemy async
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy import text
from config import settings

# Motor de base de datos
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

# Session factory
async_session_maker = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Base para modelos
Base = declarative_base()


async def get_db() -> AsyncSession:
    """
    Dependency para obtener sesión de base de datos
    """
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def set_tenant_context(session: AsyncSession, tenant_id: str):
    """
    Setea el tenant_id en PostgreSQL para Row Level Security
    ⚠️ CRÍTICO: Debe ejecutarse antes de CUALQUIER query
    """
    await session.execute(
        text(f"SET LOCAL app.current_tenant_id = '{tenant_id}'")
    )
