"""Conexión a db_clientes (Database per Service)."""
import os
import time

from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3307")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "root")
DB_NAME = os.getenv("DB_NAME", "db_clientes")

URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"
engine = create_engine(URL, pool_pre_ping=True, pool_recycle=1800)


def wait_for_db(retries: int = 30, delay: float = 2.0) -> None:
    """MySQL tarda en arrancar: reintenta en vez de caerse al primer intento."""
    for intento in range(1, retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print(f"[db] conectado a {DB_HOST}:{DB_PORT}/{DB_NAME}", flush=True)
            return
        except OperationalError as exc:
            print(f"[db] intento {intento}/{retries} falló: {exc.orig}", flush=True)
            time.sleep(delay)
    raise RuntimeError("No se pudo conectar a la base de datos")
