"""
Modelo de Agencia (Tenant)
"""
import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.core.database import Base


class Agencia(Base):
    """
    Modelo de Agencia (Tenant en el sistema multi-tenant)
    """
    __tablename__ = "agencias"

    # UUID como Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Datos de la agencia
    nombre = Column(String(255), nullable=False)
    razon_social = Column(String(255), nullable=False)
    cuit = Column(String(13), unique=True, nullable=False)

    # Configuración multi-moneda
    moneda_principal = Column(String(3), default='ARS')

    # Plan SaaS
    plan = Column(String(50), default='free')

    # Estado
    activa = Column(Boolean, default=True)

    # API Key (hash)
    api_key_hash = Column(Text, nullable=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    def __repr__(self):
        return f"<Agencia {self.nombre} ({self.cuit})>"
