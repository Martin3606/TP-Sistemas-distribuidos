from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import engine, get_db
from app.models.vehiculo import Vehiculo
from app.schemas.vehiculo import VehiculoCreate, VehiculoUpdate
from app.routers import clientes

app = FastAPI(title="Rentar - API REST", version="1.0.0")

# Configuración de CORS para permitir la conexión desde el Frontend Web
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar Ruteador de Clientes
app.include_router(clientes.router)


@app.get("/health")
def health_check():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}

# Da de alta un nuevo vehículo
@app.post("/vehiculos", status_code=201)
def crear_vehiculo(vehiculo: VehiculoCreate, db: Session = Depends(get_db)):
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
@app.put("/vehiculos/{vehiculo_id}")
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
@app.delete("/vehiculos/{vehiculo_id}")
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
@app.get("/vehiculos")
def consultar_vehiculos(db: Session = Depends(get_db)):
    return db.query(Vehiculo).all()