import math
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.cliente import Cliente
from app.models.vehiculo import Vehiculo
from app.models.reserva import Reserva, EstadoReserva
from app.schemas.reserva import ReservaCreate, ReservaOut

router = APIRouter(prefix="/reservas", tags=["Reservas"])


def _sin_zona_horaria(fecha: datetime) -> datetime:
    """Normaliza una fecha a 'naive' (sin timezone), convirtiendo a UTC primero
    si venía con zona horaria. MySQL guarda DATETIME sin timezone, así que todo
    lo que comparemos o guardemos tiene que ser consistente en ese formato."""
    if fecha.tzinfo is not None:
        fecha = fecha.astimezone(timezone.utc).replace(tzinfo=None)
    return fecha


@router.post("", response_model=ReservaOut, status_code=status.HTTP_201_CREATED)
def crear_reserva(datos: ReservaCreate, db: Session = Depends(get_db)):
    fecha_inicio = _sin_zona_horaria(datos.fecha_inicio)
    fecha_fin = _sin_zona_horaria(datos.fecha_fin)

    # 1. El cliente debe existir y estar activo
    cliente = db.get(Cliente, datos.cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="El cliente no existe")
    if not cliente.activo:
        raise HTTPException(status_code=400, detail="El cliente se encuentra inactivo")

    # 2. El vehículo debe existir y estar activo
    vehiculo = db.get(Vehiculo, datos.vehiculo_id)
    if not vehiculo:
        raise HTTPException(status_code=404, detail="El vehículo no existe")
    if not vehiculo.activo:
        raise HTTPException(status_code=400, detail="El vehículo se encuentra inactivo")

    # 3. La fecha de inicio debe ser futura
    if fecha_inicio <= datetime.now():
        raise HTTPException(status_code=400, detail="La fecha de inicio debe ser futura")

    # 4. Disponibilidad: que ninguna reserva CONFIRMADA de ese vehículo
    #    se solape con el período pedido.
    #    Dos rangos [a_ini, a_fin] y [b_ini, b_fin] se solapan si:
    #    a_ini < b_fin  Y  a_fin > b_ini
    solapamiento = (
        db.query(Reserva)
        .filter(
            Reserva.vehiculo_id == datos.vehiculo_id,
            Reserva.estado == EstadoReserva.CONFIRMADA,
            Reserva.fecha_inicio < fecha_fin,
            Reserva.fecha_fin > fecha_inicio,
        )
        .first()
    )
    if solapamiento:
        raise HTTPException(
            status_code=409,
            detail="El vehículo no está disponible durante el período solicitado",
        )

    # 5. Cálculo del importe (redondeando la duración hacia arriba, mínimo 1 día)
    duracion_horas = (fecha_fin - fecha_inicio).total_seconds() / 3600
    dias = max(1, math.ceil(duracion_horas / 24))
    importe_total = vehiculo.precio_diario * Decimal(dias)

    nueva_reserva = Reserva(
        cliente_id=datos.cliente_id,
        vehiculo_id=datos.vehiculo_id,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        precio_diario_snapshot=vehiculo.precio_diario,
        importe_total=importe_total,
        estado=EstadoReserva.CONFIRMADA,
    )

    db.add(nueva_reserva)
    db.commit()
    db.refresh(nueva_reserva)

    return nueva_reserva


@router.patch("/{reserva_id}/cancelar", response_model=ReservaOut)
def cancelar_reserva(reserva_id: int, db: Session = Depends(get_db)):
    # 1. La reserva debe existir
    reserva = db.get(Reserva, reserva_id)
    if not reserva:
        raise HTTPException(status_code=404, detail="La reserva no existe")

    # 2. Solo se puede cancelar una reserva que esté CONFIRMADA
    if reserva.estado != EstadoReserva.CONFIRMADA:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede cancelar una reserva en estado {reserva.estado.value}",
        )

    # 3. El período todavía no puede haber comenzado
    if reserva.fecha_inicio <= datetime.now():
        raise HTTPException(
            status_code=400,
            detail="No se puede cancelar una reserva cuyo período ya comenzó",
        )

    # Cambio de estado (soft state change): no se borra la fila,
    # así queda registrada para el historial.
    reserva.estado = EstadoReserva.CANCELADA
    db.commit()
    db.refresh(reserva)

    return reserva
