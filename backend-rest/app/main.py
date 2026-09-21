from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import engine
from app.routers import reservas

app = FastAPI(title="Rentar - API REST", version="1.0.0")

# CORS: permite que el frontend (Vite, en :5173) llame a este backend (:8000).
# Sin esto, el navegador bloquea la llamada en el paso previo ("preflight")
# antes de llegar a mandar el POST/PATCH real.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reservas.router)


@app.get("/health")
def health_check():
    """Prueba real de conexión a la base: si esto responde 'connected',
    el backend Python y MySQL ya se están hablando correctamente."""
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}
