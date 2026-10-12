import math
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.cliente import Cliente
from app.models.vehiculo import Vehiculo
from app.models.reserva import Reserva, EstadoReserva
from app.models.usuario import Usuario, RolUsuario
from app.schemas.reserva import ReservaCreate, ReservaOut
from app.auth.jwt import get_current_user

router = APIRouter(prefix="/reservas", tags=["Reservas"])


def _sin_zona_horaria(fecha: datetime) -> datetime:
    """Normaliza una fecha a 'naive' (sin timezone), convirtiendo a UTC primero
    si venía con zona horaria."""
    if fecha.tzinfo is not None:
        fecha = fecha.astimezone(timezone.utc).replace(tzinfo=None)
    return fecha


@router.post("", response_model=ReservaOut, status_code=status.HTTP_201_CREATED)
def crear_reserva(
    datos: ReservaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    # 1. Buscar Cliente por Documento (DNI), por ID o por el usuario cliente logueado
    cliente = None
    if datos.documento:
        cliente = db.query(Cliente).filter(Cliente.documento == datos.documento.strip()).first()
    elif datos.cliente_id:
        cliente = db.get(Cliente, datos.cliente_id)
    elif current_user.rol == RolUsuario.CLIENTE and current_user.cliente_id:
        cliente = db.get(Cliente, current_user.cliente_id)

    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró ningún cliente registrado para asociar a la reserva"
        )

    if not cliente.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El cliente se encuentra inactivo y no puede realizar alquileres"
        )

    # 2. Si el usuario logueado es CLIENTE, verificar que coincida con su propio registro
    if current_user.rol == RolUsuario.CLIENTE:
        if current_user.cliente_id and cliente.id != current_user.cliente_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No está autorizado para crear reservas en nombre de otro cliente"
            )

    # 3. Buscar Vehículo por Patente o por ID
    vehiculo = None
    if datos.patente:
        vehiculo = db.query(Vehiculo).filter(Vehiculo.patente == datos.patente.strip()).first()
    elif datos.vehiculo_id:
        vehiculo = db.get(Vehiculo, datos.vehiculo_id)

    if not vehiculo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró el vehículo especificado"
        )
    if not vehiculo.activo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El vehículo se encuentra inactivo y no está disponible para alquiler"
        )

    from datetime import timedelta
    fecha_inicio = _sin_zona_horaria(datos.fecha_inicio)
    fecha_fin = _sin_zona_horaria(datos.fecha_fin)

    # 4. Validar fecha inicio futura (tolerancia de 5 minutos para cubrir el tiempo de llenado del formulario)
    ahora_naive = _sin_zona_horaria(datetime.now())
    if fecha_inicio < ahora_naive - timedelta(minutes=5):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha de inicio debe ser futura respecto a la hora actual"
        )


    # 5. Disponibilidad: verificar que no existan reservas CONFIRMADAS solapadas
    solapamiento = (
        db.query(Reserva)
        .filter(
            Reserva.vehiculo_id == vehiculo.id,
            Reserva.estado == EstadoReserva.CONFIRMADA,
            Reserva.fecha_inicio < fecha_fin,
            Reserva.fecha_fin > fecha_inicio,
        )
        .first()
    )
    if solapamiento:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El vehículo no está disponible durante el período solicitado",
        )

    # 6. Cálculo del importe (redondeando la duración hacia arriba en días, mín 1)
    duracion_horas = (fecha_fin - fecha_inicio).total_seconds() / 3600
    dias = max(1, math.ceil(duracion_horas / 24))
    importe_total = vehiculo.precio_diario * Decimal(dias)

    nueva_reserva = Reserva(
        cliente_id=cliente.id,
        vehiculo_id=vehiculo.id,
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
def cancelar_reserva(
    reserva_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    reserva = db.get(Reserva, reserva_id)
    if not reserva:
        raise HTTPException(status_code=404, detail="La reserva no existe")

    if current_user.rol == RolUsuario.CLIENTE:
        if current_user.cliente_id and reserva.cliente_id != current_user.cliente_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No está autorizado para cancelar la reserva de otro cliente"
            )

    if reserva.estado != EstadoReserva.CONFIRMADA:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede cancelar una reserva en estado {reserva.estado.value}",
        )

    if reserva.fecha_inicio <= datetime.now():
        raise HTTPException(
            status_code=400,
            detail="No se puede cancelar una reserva cuyo período ya comenzó",
        )

    reserva.estado = EstadoReserva.CANCELADA
    db.commit()
    db.refresh(reserva)

    return reserva
