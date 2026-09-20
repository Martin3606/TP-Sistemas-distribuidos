from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, field_validator


class ReservaCreate(BaseModel):
    """Lo que el cliente HTTP debe enviar para crear una reserva."""

    cliente_id: int
    vehiculo_id: int
    fecha_inicio: datetime
    fecha_fin: datetime

    @field_validator("fecha_fin")
    @classmethod
    def fin_posterior_a_inicio(cls, fecha_fin, info):
        fecha_inicio = info.data.get("fecha_inicio")
        if fecha_inicio and fecha_fin <= fecha_inicio:
            raise ValueError(
                "La fecha de finalización debe ser posterior a la fecha de inicio"
            )
        return fecha_fin


class ReservaOut(BaseModel):
    """Lo que devolvemos como respuesta."""

    id: int
    cliente_id: int
    vehiculo_id: int
    fecha_inicio: datetime
    fecha_fin: datetime
    precio_diario_snapshot: Decimal
    importe_total: Decimal
    estado: str

    class Config:
        from_attributes = True  # permite construir esto directo desde el modelo ORM
