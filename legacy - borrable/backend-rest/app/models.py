from sqlalchemy import Column, Integer, String, SmallInteger, Numeric, Boolean, Enum
from app.database import Base


class Vehiculo(Base):
    __tablename__ = "vehiculo"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patente = Column(String(10), nullable=False, unique=True)
    marca = Column(String(60), nullable=False)
    modelo = Column(String(60), nullable=False)
    anio = Column(SmallInteger, nullable=False)
    color = Column(String(30), nullable=True)
    tipo_vehiculo = Column(
        Enum("SEDAN", "SUV", "PICKUP", "COUPE", "HATCHBACK"),
        nullable=False
    )
    precio_diario = Column(Numeric(10, 2), nullable=False)
    estado = Column(
        Enum("DISPONIBLE", "RESERVADO", "EN_ALQUILER"),
        nullable=False,
        default="DISPONIBLE"
    )
    activo = Column(Boolean, nullable=False, default=True)