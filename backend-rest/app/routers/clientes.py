from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.cliente import Cliente
from app.schemas.cliente import ClienteCreate, ClienteUpdate, ClienteOut

router = APIRouter(prefix="/api/clientes", tags=["Clientes"])


@router.post("", response_model=ClienteOut, status_code=status.HTTP_201_CREATED)
def crear_cliente(cliente_in: ClienteCreate, db: Session = Depends(get_db)):
    """
    [Requerimiento 3 - ABM Clientes] Alta de cliente.
    Valida que el documento y el email sean únicos en el sistema.
    """
    # 1. Validar documento único
    if db.query(Cliente).filter(Cliente.documento == cliente_in.documento).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un cliente registrado con el documento '{cliente_in.documento}'."
        )

    # 2. Validar email único
    if db.query(Cliente).filter(Cliente.email == cliente_in.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un cliente registrado con el email '{cliente_in.email}'."
        )

    nuevo_cliente = Cliente(
        documento=cliente_in.documento,
        nombre=cliente_in.nombre,
        apellido=cliente_in.apellido,
        email=cliente_in.email,
        telefono=cliente_in.telefono,
        fecha_nacimiento=cliente_in.fecha_nacimiento,
        activo=True
    )

    db.add(nuevo_cliente)
    db.commit()
    db.refresh(nuevo_cliente)
    return nuevo_cliente


@router.get("", response_model=List[ClienteOut])
def listar_clientes(
    solo_activos: bool = Query(False, description="Si es True, filtra únicamente los clientes activos"),
    db: Session = Depends(get_db)
):
    """
    [Requerimiento 3 - ABM Clientes] Consulta / Listado de clientes.
    """
    query = db.query(Cliente)
    if solo_activos:
        query = query.filter(Cliente.activo.is_(True))
    return query.all()


@router.get("/{cliente_id}", response_model=ClienteOut)
def obtener_cliente(cliente_id: int, db: Session = Depends(get_db)):
    """
    [Requerimiento 3 - ABM Clientes] Consulta de un cliente por su ID.
    """
    cliente = db.get(Cliente, cliente_id)
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró el cliente con ID {cliente_id}."
        )
    return cliente


@router.put("/{cliente_id}", response_model=ClienteOut)
def actualizar_cliente(cliente_id: int, cliente_in: ClienteUpdate, db: Session = Depends(get_db)):
    """
    [Requerimiento 3 - ABM Clientes] Modificación de datos de un cliente.
    """
    cliente = db.get(Cliente, cliente_id)
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró el cliente con ID {cliente_id}."
        )

    # Validar documento único si cambia
    if cliente_in.documento and cliente_in.documento != cliente.documento:
        if db.query(Cliente).filter(Cliente.documento == cliente_in.documento, Cliente.id != cliente_id).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe otro cliente con el documento '{cliente_in.documento}'."
            )
        cliente.documento = cliente_in.documento

    # Validar email único si cambia
    if cliente_in.email and cliente_in.email != cliente.email:
        if db.query(Cliente).filter(Cliente.email == cliente_in.email, Cliente.id != cliente_id).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe otro cliente con el email '{cliente_in.email}'."
            )
        cliente.email = cliente_in.email

    if cliente_in.nombre is not None:
        cliente.nombre = cliente_in.nombre
    if cliente_in.apellido is not None:
        cliente.apellido = cliente_in.apellido
    if cliente_in.telefono is not None:
        cliente.telefono = cliente_in.telefono
    if cliente_in.fecha_nacimiento is not None:
        cliente.fecha_nacimiento = cliente_in.fecha_nacimiento
    if cliente_in.activo is not None:
        cliente.activo = cliente_in.activo

    db.commit()
    db.refresh(cliente)
    return cliente


@router.delete("/{cliente_id}", response_model=ClienteOut)
def baja_logica_cliente(cliente_id: int, db: Session = Depends(get_db)):
    """
    [Requerimiento 3 - ABM Clientes] Baja lógica de cliente (`activo = False`).
    Los clientes inactivos no pueden realizar nuevos alquileres.
    """
    cliente = db.get(Cliente, cliente_id)
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No se encontró el cliente con ID {cliente_id}."
        )

    cliente.activo = False
    db.commit()
    db.refresh(cliente)
    return cliente
