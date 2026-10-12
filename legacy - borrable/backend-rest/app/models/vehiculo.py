import enum

from sqlalchemy import (
    Column, Integer, String, SmallInteger, Numeric, Boolean, DateTime, Enum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class TipoVehiculo(str, enum.Enum):
    SEDAN = "SEDAN"
    SUV = "SUV"
    PICKUP = "PICKUP"
    COUPE = "COUPE"
    HATCHBACK = "HATCHBACK"


class EstadoVehiculo(str, enum.Enum):
    DISPONIBLE = "DISPONIBLE"
    RESERVADO = "RESERVADO"
    EN_ALQUILER = "EN_ALQUILER"


class Vehiculo(Base):
    """Mapea la tabla `vehiculo`, ya creada por db/init.sql."""

    __tablename__ = "vehiculo"

    id = Column(Integer, primary_key=True, index=True)
    patente = Column(String(10), unique=True, nullable=False)
    marca = Column(String(60), nullable=False)
    modelo = Column(String(60), nullable=False)
    anio = Column(SmallInteger, nullable=False)
    color = Column(String(30))
    tipo_vehiculo = Column(Enum(TipoVehiculo), nullable=False)
    precio_diario = Column(Numeric(10, 2), nullable=False)
    estado = Column(Enum(EstadoVehiculo), nullable=False, default=EstadoVehiculo.DISPONIBLE)
    activo = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    reservas = relationship("Reserva", back_populates="vehiculo")
