from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import exc
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.vehiculo import Vehiculo
from app.schemas.vehiculo import VehiculoCreate, VehiculoUpdate

router = APIRouter(prefix="/vehiculos", tags=["Vehículos"])


@router.post("", status_code=status.HTTP_201_CREATED)
def crear_vehiculo(vehiculo: VehiculoCreate, db: Session = Depends(get_db)):
    """
    [Requerimiento 1 - ABM Vehículos] Alta de vehículo.
    Estado inicial: DISPONIBLE, activo = True. Patente única.
    """
    nuevo_vehiculo = Vehiculo(**vehiculo.model_dump())

    db.add(nuevo_vehiculo)
    try:
        db.commit()
        db.refresh(nuevo_vehiculo)
    except exc.IntegrityError as e:
        db.rollback()
        if hasattr(e.orig, "args") and e.orig.args[0] == 1062:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"La patente '{vehiculo.patente}' ya se encuentra registrada en el sistema."
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error de integridad al registrar el vehículo."
        )

    return nuevo_vehiculo


@router.get("")
def consultar_vehiculos(db: Session = Depends(get_db)):
    """
    [Requerimiento 1 - ABM Vehículos] Consulta de todos los vehículos registrados.
    """
    return db.query(Vehiculo).all()


@router.get("/{vehiculo_id}")
def obtener_vehiculo(vehiculo_id: int, db: Session = Depends(get_db)):
    """
    [Requerimiento 1 - ABM Vehículos] Consulta de vehículo por ID.
    """
    vehiculo = db.get(Vehiculo, vehiculo_id)
    if not vehiculo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró el vehículo con ID {vehiculo_id}."
        )
    return vehiculo


@router.put("/{vehiculo_id}")
def modificar_vehiculo(
    vehiculo_id: int,
    vehiculo: VehiculoUpdate,
    db: Session = Depends(get_db)
):
    """
    [Requerimiento 1 - ABM Vehículos] Modificación de datos de un vehículo.
    NOTA: La patente NO se modifica una vez registrado el vehículo.
    """
    vehiculo_db = db.get(Vehiculo, vehiculo_id)
    if not vehiculo_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró el vehículo con ID {vehiculo_id}."
        )

    # Actualizar únicamente los campos permitidos (excluyendo la patente)
    for campo, valor in vehiculo.model_dump().items():
        if campo != "patente":
            setattr(vehiculo_db, campo, valor)

    db.commit()
    db.refresh(vehiculo_db)
    return vehiculo_db


@router.delete("/{vehiculo_id}")
def eliminar_vehiculo(vehiculo_id: int, db: Session = Depends(get_db)):
    """
    [Requerimiento 1 - ABM Vehículos] Baja lógica de vehículo (`activo = False`).
    Los vehículos inactivos no pueden utilizarse para nuevos alquileres.
    """
    vehiculo_db = db.get(Vehiculo, vehiculo_id)
    if not vehiculo_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró el vehículo con ID {vehiculo_id}."
        )

    vehiculo_db.activo = False
    db.commit()
    db.refresh(vehiculo_db)
    return vehiculo_db
