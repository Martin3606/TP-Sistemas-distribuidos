import enum

from sqlalchemy import Column, Integer, ForeignKey, DateTime, Numeric, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class EstadoReserva(str, enum.Enum):
    CONFIRMADA = "CONFIRMADA"
    CANCELADA = "CANCELADA"
    FINALIZADA = "FINALIZADA"


class Reserva(Base):
    """Mapea la tabla `reserva`, ya creada por db/init.sql."""

    __tablename__ = "reserva"

    id = Column(Integer, primary_key=True, index=True)
    cliente_id = Column(Integer, ForeignKey("cliente.id"), nullable=False)
    vehiculo_id = Column(Integer, ForeignKey("vehiculo.id"), nullable=False)
    fecha_inicio = Column(DateTime, nullable=False)
    fecha_fin = Column(DateTime, nullable=False)
    precio_diario_snapshot = Column(Numeric(10, 2), nullable=False)
    importe_total = Column(Numeric(10, 2), nullable=False)
    estado = Column(Enum(EstadoReserva), nullable=False, default=EstadoReserva.CONFIRMADA)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    cliente = relationship("Cliente", back_populates="reservas")
    vehiculo = relationship("Vehiculo", back_populates="reservas")
