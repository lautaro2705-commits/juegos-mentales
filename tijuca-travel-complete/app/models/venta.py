"""
Modelo de Venta
"""
import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Numeric, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Venta(Base):
    """
    Modelo de Venta (con Row Level Security)
    """
    __tablename__ = "ventas"

    # UUID como Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Foreign Key al tenant (NUNCA NULL)
    agencia_id = Column(UUID(as_uuid=True), ForeignKey('agencias.id', ondelete='CASCADE'), nullable=False)

    # Datos del cliente
    cliente_nombre = Column(String(255), nullable=False)
    cliente_email = Column(String(255))
    cliente_telefono = Column(String(50))

    # Información del producto/servicio
    descripcion = Column(Text, nullable=False)
    destino = Column(String(255))

    # Datos financieros
    moneda = Column(String(3), nullable=False)
    monto_base = Column(Numeric(12, 2), nullable=False)

    # Impuestos argentinos
    impuesto_pais = Column(Numeric(12, 2), default=0)
    percepcion_ganancias = Column(Numeric(12, 2), default=0)
    percepcion_iibb = Column(Numeric(12, 2), default=0)
    monto_total = Column(Numeric(12, 2), nullable=False)

    # Estado
    estado = Column(String(50), default='pendiente')

    # Trazabilidad HunterBot
    vendido_por_hunterbot = Column(Boolean, default=False)
    conversacion_whatsapp_id = Column(String(255))

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relación con Agencia
    agencia = relationship("Agencia", backref="ventas")

    def __repr__(self):
        return f"<Venta {self.cliente_nombre} - {self.monto_total} {self.moneda}>"
