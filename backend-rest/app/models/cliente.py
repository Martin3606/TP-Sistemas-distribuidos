from sqlalchemy import Column, Integer, String, Date, Boolean, DateTime
from sqlalchemy.sql import func

from app.database import Base


class Cliente(Base):
    """
    Mapea la tabla `cliente` definida en db/init.sql.
    """
    __tablename__ = "cliente"

    id = Column(Integer, primary_key=True, index=True)
    documento = Column(String(20), unique=True, nullable=False)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    telefono = Column(String(30), nullable=True)
    fecha_nacimiento = Column(Date, nullable=True)
    activo = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
