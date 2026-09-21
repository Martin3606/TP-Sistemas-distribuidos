from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app.models.vehiculo import Vehiculo
from app.schemas.vehiculo import VehiculoCreate, VehiculoUpdate


router = APIRouter(prefix="/vehiculos", tags=["Vehículos"])


# Da de alta un nuevo vehículo
@router.post("", status_code=201)
def crear_vehiculo(
    vehiculo: VehiculoCreate,
    db: Session = Depends(get_db)
):
    nuevo_vehiculo = Vehiculo(**vehiculo.model_dump())

    db.add(nuevo_vehiculo)

    try:
        db.commit()
        db.refresh(nuevo_vehiculo)
    except IntegrityError as e:
        db.rollback()

        if e.orig.args[0] == 1062:
            raise HTTPException(
                status_code=409,
                detail="La patente ya existe"
            )

        raise

    return nuevo_vehiculo


# Modifica los datos de un vehículo existente por su ID
@router.put("/{vehiculo_id}")
def modificar_vehiculo(
    vehiculo_id: int,
    vehiculo: VehiculoUpdate,
    db: Session = Depends(get_db)
):
    vehiculo_db = db.get(Vehiculo, vehiculo_id)

    if not vehiculo_db:
        raise HTTPException(
            status_code=404,
            detail="Vehículo no encontrado"
        )

    for campo, valor in vehiculo.model_dump().items():
        setattr(vehiculo_db, campo, valor)

    db.commit()
    db.refresh(vehiculo_db)

    return vehiculo_db


# Da de baja lógicamente un vehículo
@router.delete("/{vehiculo_id}")
def eliminar_vehiculo(
    vehiculo_id: int,
    db: Session = Depends(get_db)
):
    vehiculo_db = db.get(Vehiculo, vehiculo_id)

    if not vehiculo_db:
        raise HTTPException(
            status_code=404,
            detail="Vehículo no encontrado"
        )

    vehiculo_db.activo = False

    db.commit()
    db.refresh(vehiculo_db)

    return vehiculo_db


# Consulta todos los vehículos registrados
@router.get("")
def consultar_vehiculos(db: Session = Depends(get_db)):
    return db.query(Vehiculo).all()