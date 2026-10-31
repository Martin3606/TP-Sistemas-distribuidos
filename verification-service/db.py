"""Acceso a los registros simulados de db_vehiculos."""

import os
import time

from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError


DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3307")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "root")
DB_NAME = os.getenv("DB_NAME", "db_vehiculos")

URL = (
    f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/"
    f"{DB_NAME}?charset=utf8mb4"
)
engine = create_engine(URL, pool_pre_ping=True, pool_recycle=1800)


def wait_for_db(retries: int = 30, delay: float = 2.0) -> None:
    for attempt in range(1, retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print(f"[verification-db] conectado a {DB_HOST}:{DB_PORT}/{DB_NAME}", flush=True)
            return
        except OperationalError as exc:
            print(f"[verification-db] intento {attempt}/{retries}: {exc.orig}", flush=True)
            time.sleep(delay)
    raise RuntimeError("No se pudo conectar con db_vehiculos")
