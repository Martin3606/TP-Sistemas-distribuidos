from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import engine
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
    """Prueba real de conexión a la base: si esto responde 'connected',
    el backend Python y MySQL ya se están hablando correctamente."""
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}

