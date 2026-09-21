from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import engine
from app.routers import reservas, vehiculos, clientes

app = FastAPI(title="Rentar - API REST", version="1.0.0")

# 1. Configuración de CORS (soporta preflight OPTIONS y cualquier origen)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Registrar Ruteadores con compatibilidad dual (/api/... y /...)
# Clientes: mapea /api/clientes y /clientes
app.include_router(clientes.router, prefix="/api")
app.include_router(clientes.router)

# Vehículos: mapea /vehiculos y /api/vehiculos
app.include_router(vehiculos.router)
app.include_router(vehiculos.router, prefix="/api")

# Reservas: mapea /reservas y /api/reservas
app.include_router(reservas.router)
app.include_router(reservas.router, prefix="/api")

app.include_router(vehiculos.router)
app.include_router(clientes.router)

@app.get("/health")
def health_check():
    """Prueba real de conexión a la base de datos."""
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}
