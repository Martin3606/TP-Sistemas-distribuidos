"""Vehicle Service - servidor gRPC (puerto 50051).

Responsabilidades (enunciado Hito 2): consultar vehículos, consultar uno,
consultar disponibilidad, actualizar estado y aplicar las validaciones propias
de los vehículos. Persiste SOLO en db_vehiculos.
"""
import os
import re
from concurrent import futures
from datetime import datetime, timezone
from decimal import Decimal

import grpc
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

import vehicle_pb2
import vehicle_pb2_grpc
from db import engine, wait_for_db

GRPC_PORT = os.getenv("GRPC_PORT", "50051")
ANIO_MINIMO = 1990

TIPO_A_STR = {
    vehicle_pb2.VEHICLE_TYPE_SEDAN: "SEDAN",
    vehicle_pb2.VEHICLE_TYPE_SUV: "SUV",
    vehicle_pb2.VEHICLE_TYPE_PICKUP: "PICKUP",
    vehicle_pb2.VEHICLE_TYPE_COUPE: "COUPE",
    vehicle_pb2.VEHICLE_TYPE_HATCHBACK: "HATCHBACK",
}
STR_A_TIPO = {v: k for k, v in TIPO_A_STR.items()}

ESTADO_A_STR = {
    vehicle_pb2.VEHICLE_STATUS_DISPONIBLE: "DISPONIBLE",
    vehicle_pb2.VEHICLE_STATUS_RESERVADO: "RESERVADO",
    vehicle_pb2.VEHICLE_STATUS_EN_ALQUILER: "EN_ALQUILER",
}
STR_A_ESTADO = {v: k for k, v in ESTADO_A_STR.items()}

COLUMNAS = ("id, patente, marca, modelo, anio, color, tipo_vehiculo, "
            "precio_diario, estado, activo")


# ---------- conversiones ----------
def a_centavos(precio: Decimal) -> int:
    return int((Decimal(precio) * 100).to_integral_value())


def de_centavos(centavos: int) -> Decimal:
    return (Decimal(centavos) / Decimal(100)).quantize(Decimal("0.01"))


def fila_a_vehicle(r) -> "vehicle_pb2.Vehicle":
    return vehicle_pb2.Vehicle(
        id=r.id,
        patente=r.patente,
        marca=r.marca,
        modelo=r.modelo,
        anio=r.anio,
        color=r.color or "",
        tipo_vehiculo=STR_A_TIPO[r.tipo_vehiculo],
        precio_diario_centavos=a_centavos(r.precio_diario),
        estado=STR_A_ESTADO[r.estado],
        activo=bool(r.activo),
    )


# ---------- validaciones propias del dominio vehículo ----------
def validar_datos(context, patente, marca, modelo, anio, tipo, precio_centavos,
                  validar_patente=True):
    if validar_patente:
        if not patente or not patente.strip():
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "La patente es obligatoria")
        if len(patente.strip()) > 10:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT,
                          "La patente no puede superar los 10 caracteres")
    if not marca or not marca.strip() or len(marca) > 60:
        context.abort(grpc.StatusCode.INVALID_ARGUMENT,
                      "La marca es obligatoria (máx. 60 caracteres)")
    if not modelo or not modelo.strip() or len(modelo) > 60:
        context.abort(grpc.StatusCode.INVALID_ARGUMENT,
                      "El modelo es obligatorio (máx. 60 caracteres)")
    anio_max = datetime.now().year + 1
    if anio < ANIO_MINIMO or anio > anio_max:
        context.abort(grpc.StatusCode.INVALID_ARGUMENT,
                      f"El año debe estar entre {ANIO_MINIMO} y {anio_max}")
    if tipo not in TIPO_A_STR:
        context.abort(grpc.StatusCode.INVALID_ARGUMENT, "El tipo de vehículo es inválido")
    if precio_centavos <= 0:
        context.abort(grpc.StatusCode.INVALID_ARGUMENT,
                      "El precio diario debe ser mayor a cero")


def normalizar_patente(patente: str) -> str:
    return re.sub(r"\s+", "", patente).upper()


def ts_a_datetime(ts):
    return datetime.fromtimestamp(ts.seconds, tz=timezone.utc)


class VehicleService(vehicle_pb2_grpc.VehicleServiceServicer):

    # ---- consultas ----
    def ListVehicles(self, request, context):
        sql = f"SELECT {COLUMNAS} FROM vehiculo"
        if request.solo_activos:
            sql += " WHERE activo = TRUE"
        sql += " ORDER BY id"
        with engine.connect() as conn:
            filas = conn.execute(text(sql)).fetchall()
        return vehicle_pb2.ListVehiclesResponse(vehiculos=[fila_a_vehicle(f) for f in filas])

    def GetVehicle(self, request, context):
        return vehicle_pb2.VehicleResponse(vehiculo=self._obtener(request.id, context))

    def CheckAvailability(self, request, context):
        """Candidatos disponibles según filtros.

        Este servicio NO conoce las reservas (viven en db_alquileres), por eso
        solo devuelve vehículos ACTIVOS y en estado DISPONIBLE que cumplen los
        filtros. El cruce por fechas lo resuelve el Gateway consultando a
        Rental Service (RentalService.CheckAvailability).
        """
        if request.HasField("fecha_inicio") and request.HasField("fecha_fin"):
            if ts_a_datetime(request.fecha_fin) <= ts_a_datetime(request.fecha_inicio):
                context.abort(grpc.StatusCode.INVALID_ARGUMENT,
                              "La fecha de fin debe ser posterior a la de inicio")

        sql = f"SELECT {COLUMNAS} FROM vehiculo WHERE activo = TRUE AND estado = 'DISPONIBLE'"
        params = {}
        f = request.filtros
        if f.tipo_vehiculo in TIPO_A_STR:
            sql += " AND tipo_vehiculo = :tipo"
            params["tipo"] = TIPO_A_STR[f.tipo_vehiculo]
        if f.marca:
            sql += " AND LOWER(marca) LIKE :marca"
            params["marca"] = f"%{f.marca.lower()}%"
        if f.modelo:
            sql += " AND LOWER(modelo) LIKE :modelo"
            params["modelo"] = f"%{f.modelo.lower()}%"
        if f.precio_min_centavos > 0:
            sql += " AND precio_diario >= :pmin"
            params["pmin"] = de_centavos(f.precio_min_centavos)
        if f.precio_max_centavos > 0:
            sql += " AND precio_diario <= :pmax"
            params["pmax"] = de_centavos(f.precio_max_centavos)
        sql += " ORDER BY id"
        with engine.connect() as conn:
            filas = conn.execute(text(sql), params).fetchall()
        return vehicle_pb2.ListVehiclesResponse(vehiculos=[fila_a_vehicle(r) for r in filas])

    # ---- ABM ----
    def CreateVehicle(self, request, context):
        validar_datos(context, request.patente, request.marca, request.modelo,
                      request.anio, request.tipo_vehiculo, request.precio_diario_centavos)
        try:
            with engine.begin() as conn:
                res = conn.execute(text(
                    "INSERT INTO vehiculo (patente, marca, modelo, anio, color, "
                    "tipo_vehiculo, precio_diario) VALUES "
                    "(:patente, :marca, :modelo, :anio, :color, :tipo, :precio)"),
                    {"patente": normalizar_patente(request.patente),
                     "marca": request.marca.strip(), "modelo": request.modelo.strip(),
                     "anio": request.anio, "color": request.color or None,
                     "tipo": TIPO_A_STR[request.tipo_vehiculo],
                     "precio": de_centavos(request.precio_diario_centavos)})
                nuevo_id = res.lastrowid
        except IntegrityError as exc:
            if exc.orig.args[0] == 1062:
                context.abort(grpc.StatusCode.ALREADY_EXISTS, "La patente ya existe")
            raise
        return vehicle_pb2.VehicleResponse(vehiculo=self._obtener(nuevo_id, context))

    def UpdateVehicle(self, request, context):
        self._obtener(request.id, context)  # 404 si no existe
        validar_datos(context, "", request.marca, request.modelo, request.anio,
                      request.tipo_vehiculo, request.precio_diario_centavos,
                      validar_patente=False)
        with engine.begin() as conn:
            conn.execute(text(
                "UPDATE vehiculo SET marca=:marca, modelo=:modelo, anio=:anio, "
                "color=:color, tipo_vehiculo=:tipo, precio_diario=:precio, "
                "activo=:activo WHERE id=:id"),
                {"marca": request.marca.strip(), "modelo": request.modelo.strip(),
                 "anio": request.anio, "color": request.color or None,
                 "tipo": TIPO_A_STR[request.tipo_vehiculo],
                 "precio": de_centavos(request.precio_diario_centavos),
                 "activo": request.activo, "id": request.id})
        return vehicle_pb2.VehicleResponse(vehiculo=self._obtener(request.id, context))

    def DeactivateVehicle(self, request, context):
        self._obtener(request.id, context)
        with engine.begin() as conn:
            conn.execute(text("UPDATE vehiculo SET activo = FALSE WHERE id = :id"),
                         {"id": request.id})
        return vehicle_pb2.VehicleResponse(vehiculo=self._obtener(request.id, context))

    def UpdateVehicleStatus(self, request, context):
        veh = self._obtener(request.id, context)
        if request.estado not in ESTADO_A_STR:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "Estado de vehículo inválido")
        if not veh.activo:
            context.abort(grpc.StatusCode.FAILED_PRECONDITION,
                          "No se puede cambiar el estado de un vehículo inactivo")
        with engine.begin() as conn:
            conn.execute(text("UPDATE vehiculo SET estado = :e WHERE id = :id"),
                         {"e": ESTADO_A_STR[request.estado], "id": request.id})
        return vehicle_pb2.VehicleResponse(vehiculo=self._obtener(request.id, context))

    # ---- helpers ----
    def _obtener(self, vehiculo_id, context):
        with engine.connect() as conn:
            fila = conn.execute(text(f"SELECT {COLUMNAS} FROM vehiculo WHERE id = :id"),
                                {"id": vehiculo_id}).fetchone()
        if fila is None:
            context.abort(grpc.StatusCode.NOT_FOUND, "Vehículo no encontrado")
        return fila_a_vehicle(fila)


def serve():
    wait_for_db()
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    vehicle_pb2_grpc.add_VehicleServiceServicer_to_server(VehicleService(), server)
    server.add_insecure_port(f"[::]:{GRPC_PORT}")
    server.start()
    print(f"[vehicle-service] gRPC escuchando en :{GRPC_PORT}", flush=True)
    server.wait_for_termination()


if __name__ == "__main__":
    serve()
