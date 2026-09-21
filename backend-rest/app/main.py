from fastapi import FastAPI
from sqlalchemy import text

from app.database import engine
from app.routers import reservas, vehiculos, clientes

app = FastAPI(title="Rentar - API REST", version="1.0.0")

app.include_router(reservas.router)
app.include_router(vehiculos.router)
app.include_router(clientes.router)

@app.get("/health")
def health_check():
    """Prueba real de conexión a la base: si esto responde 'connected',
    el backend Python y MySQL ya se están hablando correctamente."""
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}
