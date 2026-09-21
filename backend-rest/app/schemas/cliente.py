from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class ClienteBase(BaseModel):
    documento: str = Field(..., max_length=20, description="Número de documento único y obligatorio")
    nombre: str = Field(..., max_length=100, description="Nombre del cliente")
    apellido: str = Field(..., max_length=100, description="Apellido del cliente")
    email: EmailStr = Field(..., description="Correo electrónico único y obligatorio")
    telefono: Optional[str] = Field(None, max_length=30, description="Teléfono de contacto (opcional)")
    fecha_nacimiento: Optional[date] = Field(None, description="Fecha de nacimiento en formato YYYY-MM-DD")


class ClienteCreate(ClienteBase):
    """Esquema para el alta de un nuevo cliente."""
    pass


class ClienteUpdate(BaseModel):
    """Esquema para actualización parcial/total de un cliente."""
    documento: Optional[str] = Field(None, max_length=20, description="Número de documento")
    nombre: Optional[str] = Field(None, max_length=100, description="Nombre del cliente")
    apellido: Optional[str] = Field(None, max_length=100, description="Apellido del cliente")
    email: Optional[EmailStr] = Field(None, description="Correo electrónico")
    telefono: Optional[str] = Field(None, max_length=30, description="Teléfono de contacto")
    fecha_nacimiento: Optional[date] = Field(None, description="Fecha de nacimiento (YYYY-MM-DD)")
    activo: Optional[bool] = Field(None, description="Estado de activación")


class ClienteOut(ClienteBase):
    """Esquema de respuesta para las consultas de cliente."""
    id: int
    activo: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
