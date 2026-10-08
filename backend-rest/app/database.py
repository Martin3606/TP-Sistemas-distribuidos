import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Carga las variables definidas en el archivo .env (nunca hardcodear credenciales)
load_dotenv()

DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")

DATABASE_URL = (
    f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"
)

# echo=True muestra el SQL generado en consola, util mientras aprendemos/debugueamos
engine = create_engine(DATABASE_URL, pool_pre_ping=True, echo=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Las clases de modelos (Vehiculo, Cliente, Reserva) van a heredar de Base.
# OJO: las tablas ya las crea db/init.sql, así que estos modelos van a
# MAPEAR tablas existentes, no a crearlas. Es la diferencia con Hibernate
# cuando usabas ddl-auto=update: acá el schema lo controla el SQL, no el ORM.
Base = declarative_base()


def get_db():
    """Dependency de FastAPI: abre una sesión por request y la cierra al final."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
