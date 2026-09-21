from decimal import Decimal
from pydantic import BaseModel, Field
from typing import Literal


# Datos requeridos para dar de alta un vehículo
class VehiculoCreate(BaseModel):
    patente: str = Field(min_length=1, max_length=10)
    marca: str = Field(min_length=1, max_length=60)
    modelo: str = Field(min_length=1, max_length=60)
    anio: int = Field(ge=1990)
    color: str | None = Field(default=None, max_length=30)
    tipo_vehiculo: Literal["SEDAN", "SUV", "PICKUP", "COUPE", "HATCHBACK"]
    precio_diario: Decimal = Field(gt=0)


# Datos permitidos para modificar un vehículo
class VehiculoUpdate(BaseModel):
    marca: str = Field(min_length=1, max_length=60)
    modelo: str = Field(min_length=1, max_length=60)
    anio: int = Field(ge=1990)
    color: str | None = Field(default=None, max_length=30)
    tipo_vehiculo: Literal["SEDAN", "SUV", "PICKUP", "COUPE", "HATCHBACK"]
    precio_diario: Decimal = Field(gt=0)
