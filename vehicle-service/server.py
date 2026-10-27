"""Vehicle Service: gRPC API and RabbitMQ workflows for Hito 3."""
import os
import re
import threading
from concurrent import futures
from datetime import datetime, timezone
from decimal import Decimal

import grpc
from google.protobuf.timestamp_pb2 import Timestamp
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

import vehicle_pb2 as pb
import vehicle_pb2_grpc as pb_grpc
from db import engine, wait_for_db
from messaging import EventPublishError, publish_event, start_consumer

GRPC_PORT = os.getenv("GRPC_PORT", "50051")
ANIO_MINIMO = 1990
EVENT_OWN_RESULT = "vehiculos.verificacion.resultado"
EVENT_EXTERNAL_REGISTERED = "vehiculos.externos.registrados"
EVENT_PLATE_RESULT = "vehiculos.externos.validacion.patente"
EVENT_OWNERSHIP_RESULT = "vehiculos.externos.validacion.titularidad"
EVENT_EXTERNAL_COMPLETED = "vehiculos.externos.validacion.completada"

TIPO_A_STR = {
    pb.VEHICLE_TYPE_SEDAN: "SEDAN", pb.VEHICLE_TYPE_SUV: "SUV",
    pb.VEHICLE_TYPE_PICKUP: "PICKUP", pb.VEHICLE_TYPE_COUPE: "COUPE",
    pb.VEHICLE_TYPE_HATCHBACK: "HATCHBACK",
}
STR_A_TIPO = {v: k for k, v in TIPO_A_STR.items()}
ESTADO_A_STR = {
    pb.VEHICLE_STATUS_DISPONIBLE: "DISPONIBLE",
    pb.VEHICLE_STATUS_RESERVADO: "RESERVADO",
    pb.VEHICLE_STATUS_EN_ALQUILER: "EN_ALQUILER",
}
STR_A_ESTADO = {v: k for k, v in ESTADO_A_STR.items()}
VERIF_A_ENUM = {
    "PENDIENTE": pb.VEHICLE_VERIFICATION_RESULT_PENDIENTE,
    "VALIDADO": pb.VEHICLE_VERIFICATION_RESULT_VALIDADO,
    "ROBADO": pb.VEHICLE_VERIFICATION_RESULT_ROBADO,
}
ORIGEN_A_ENUM = {"PROPIO": pb.VEHICLE_ORIGIN_PROPIO, "EXTERNO": pb.VEHICLE_ORIGIN_EXTERNO}
REQUEST_A_ENUM = {
    "PENDIENTE": pb.EXTERNAL_VEHICLE_REQUEST_STATUS_PENDIENTE,
    "RECHAZADO": pb.EXTERNAL_VEHICLE_REQUEST_STATUS_RECHAZADO,
    "INCORPORADO": pb.EXTERNAL_VEHICLE_REQUEST_STATUS_INCORPORADO,
}
VALIDACION_A_ENUM = {
    "PENDIENTE": pb.EXTERNAL_VEHICLE_VALIDATION_RESULT_PENDIENTE,
    "VALIDADO": pb.EXTERNAL_VEHICLE_VALIDATION_RESULT_VALIDADO,
    "RECHAZADO": pb.EXTERNAL_VEHICLE_VALIDATION_RESULT_RECHAZADO,
}
VEHICLE_COLUMNS = (
    "id, patente, marca, modelo, anio, color, tipo_vehiculo, precio_diario, estado, "
    "activo, resultado_verificacion, inhabilitado_por_robo, origen, cliente_propietario_id"
)


def a_centavos(precio):
    return int((Decimal(precio) * 100).to_integral_value())


def de_centavos(centavos):
    return (Decimal(centavos) / Decimal(100)).quantize(Decimal("0.01"))


def normalizar_patente(patente):
    return re.sub(r"\s+", "", patente or "").upper()


def fila_a_vehicle(row):
    vehicle = pb.Vehicle(
        id=row.id, patente=row.patente, marca=row.marca, modelo=row.modelo,
        anio=row.anio, color=row.color or "", tipo_vehiculo=STR_A_TIPO[row.tipo_vehiculo],
        precio_diario_centavos=a_centavos(row.precio_diario), estado=STR_A_ESTADO[row.estado],
        activo=bool(row.activo),
        resultado_verificacion=VERIF_A_ENUM[row.resultado_verificacion],
        inhabilitado_por_robo=bool(row.inhabilitado_por_robo), origen=ORIGEN_A_ENUM[row.origen],
    )
    if row.cliente_propietario_id is not None:
        vehicle.cliente_propietario_id = row.cliente_propietario_id
    return vehicle


def validar_datos(context, patente, marca, modelo, anio, tipo, precio_centavos,
                  validar_patente=True):
    if validar_patente and (not patente or not patente.strip() or len(patente.strip()) > 10):
        context.abort(grpc.StatusCode.INVALID_ARGUMENT,
                      "La patente es obligatoria y no puede superar 10 caracteres")
    if not marca or not marca.strip() or len(marca) > 60:
        context.abort(grpc.StatusCode.INVALID_ARGUMENT, "La marca es obligatoria (máx. 60 caracteres)")
    if not modelo or not modelo.strip() or len(modelo) > 60:
        context.abort(grpc.StatusCode.INVALID_ARGUMENT, "El modelo es obligatorio (máx. 60 caracteres)")
    anio_max = datetime.now().year + 1
    if anio < ANIO_MINIMO or anio > anio_max:
        context.abort(grpc.StatusCode.INVALID_ARGUMENT, f"El año debe estar entre {ANIO_MINIMO} y {anio_max}")
    if tipo not in TIPO_A_STR:
        context.abort(grpc.StatusCode.INVALID_ARGUMENT, "El tipo de vehículo es inválido")
    if precio_centavos <= 0:
        context.abort(grpc.StatusCode.INVALID_ARGUMENT, "El precio diario debe ser mayor a cero")


def ya_procesado(conn, consumer, event_id):
    result = conn.execute(text(
        "INSERT IGNORE INTO evento_procesado (consumidor, event_id) VALUES (:c, :e)"
    ), {"c": consumer, "e": event_id})
    return result.rowcount == 0


def filas_validacion(conn, request_id):
    rows = conn.execute(text(
        "SELECT tipo_validacion, resultado FROM vehiculo_externo_validacion "
        "WHERE vehiculo_externo_id=:id"
    ), {"id": request_id}).fetchall()
    return {row.tipo_validacion: row.resultado for row in rows}


def fila_a_solicitud(conn, row):
    checks = filas_validacion(conn, row.id)
    created = row.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    stamp = Timestamp()
    stamp.FromDatetime(created)
    result = pb.ExternalVehicleRequest(
        id=row.id, cliente_id=row.cliente_id, documento=row.documento,
        patente=row.patente, marca=row.marca, modelo=row.modelo, anio=row.anio,
        color=row.color or "", tipo_vehiculo=STR_A_TIPO[row.tipo_vehiculo],
        precio_diario_centavos=a_centavos(row.precio_diario),
        estado=REQUEST_A_ENUM[row.estado],
        resultado_patente=VALIDACION_A_ENUM[checks.get("PATENTE", "PENDIENTE")],
        resultado_titularidad=VALIDACION_A_ENUM[checks.get("TITULARIDAD", "PENDIENTE")],
        vehiculo_id=row.vehiculo_id or 0,
    )
    result.created_at.CopyFrom(stamp)
    return result


def _lookup_vehicle(vehicle_id):
    with engine.connect() as conn:
        return conn.execute(text(f"SELECT {VEHICLE_COLUMNS} FROM vehiculo WHERE id=:id"),
                            {"id": vehicle_id}).fetchone()


def procesar_resultado_verificacion(event):
    data = event["data"]
    vehicle_id, plate, outcome = int(data["vehiculoId"]), normalizar_patente(data["patente"]), data["resultado"]
    if outcome not in ("VALIDADO", "ROBADO"):
        raise ValueError("Resultado de verificación propio inválido")
    with engine.begin() as conn:
        if ya_procesado(conn, "vehicle.own-result", event["eventId"]):
            return
        row = conn.execute(text("SELECT patente, inhabilitado_por_robo FROM vehiculo WHERE id=:id FOR UPDATE"),
                           {"id": vehicle_id}).fetchone()
        if row is None or normalizar_patente(row.patente) != plate:
            raise ValueError("El vehículo no coincide con el evento de verificación")
        if outcome == "ROBADO":
            conn.execute(text("UPDATE vehiculo SET resultado_verificacion='ROBADO', "
                              "inhabilitado_por_robo=TRUE, activo=FALSE WHERE id=:id"), {"id": vehicle_id})
        elif not row.inhabilitado_por_robo:
            conn.execute(text("UPDATE vehiculo SET resultado_verificacion='VALIDADO' WHERE id=:id"),
                         {"id": vehicle_id})


def procesar_validacion_externa(event, tipo):
    data = event["data"]
    request_id = int(data["vehiculoExternoId"])
    result = data["resultado"]
    if result not in ("VALIDADO", "RECHAZADO"):
        raise ValueError("Resultado de validación externa inválido")
    plate = normalizar_patente(data["patente"])
    with engine.begin() as conn:
        consumer = f"vehicle.external-{tipo.lower()}-result"
        if ya_procesado(conn, consumer, event["eventId"]):
            return
        request = conn.execute(text(
            "SELECT * FROM vehiculo_externo_solicitud WHERE id=:id FOR UPDATE"
        ), {"id": request_id}).fetchone()
        if request is None or normalizar_patente(request.patente) != plate:
            raise ValueError("Solicitud externa no coincide con el resultado")
        if tipo == "TITULARIDAD" and (request.cliente_id != int(data["clienteId"]) or
                                       request.documento != str(data["documento"]).strip()):
            raise ValueError("Cliente/documento no coincide con solicitud externa")
        conn.execute(text(
            "UPDATE vehiculo_externo_validacion SET resultado=:r "
            "WHERE vehiculo_externo_id=:id AND tipo_validacion=:tipo"
        ), {"r": result, "id": request_id, "tipo": tipo})
        checks = filas_validacion(conn, request_id)
        if "RECHAZADO" in checks.values():
            conn.execute(text("UPDATE vehiculo_externo_solicitud SET estado='RECHAZADO' "
                              "WHERE id=:id AND estado='PENDIENTE'"), {"id": request_id})
        elif (checks.get("PATENTE") == "VALIDADO" and checks.get("TITULARIDAD") == "VALIDADO"
              and request.estado == "PENDIENTE" and not request.completacion_publicada):
            publish_event(EVENT_EXTERNAL_COMPLETED, {"vehiculoExternoId": request_id})
            conn.execute(text("UPDATE vehiculo_externo_solicitud SET completacion_publicada=TRUE "
                              "WHERE id=:id"), {"id": request_id})


def incorporar_solicitud_externa(event):
    request_id = int(event["data"]["vehiculoExternoId"])
    with engine.begin() as conn:
        if ya_procesado(conn, "vehicle.external-completed", event["eventId"]):
            return
        request = conn.execute(text(
            "SELECT * FROM vehiculo_externo_solicitud WHERE id=:id FOR UPDATE"
        ), {"id": request_id}).fetchone()
        if request is None or request.estado != "PENDIENTE":
            return
        checks = filas_validacion(conn, request_id)
        if checks.get("PATENTE") != "VALIDADO" or checks.get("TITULARIDAD") != "VALIDADO":
            raise ValueError("No se puede incorporar sin ambas validaciones aprobadas")
        existing = conn.execute(text("SELECT id FROM vehiculo WHERE patente=:p"),
                                {"p": request.patente}).fetchone()
        if existing:
            conn.execute(text("UPDATE vehiculo_externo_solicitud SET estado='RECHAZADO' WHERE id=:id"),
                         {"id": request_id})
            return
        result = conn.execute(text(
            "INSERT INTO vehiculo (patente,marca,modelo,anio,color,tipo_vehiculo,precio_diario,"
            "estado,activo,resultado_verificacion,inhabilitado_por_robo,origen,cliente_propietario_id) "
            "VALUES (:p,:marca,:modelo,:anio,:color,:tipo,:precio,'DISPONIBLE',TRUE,'VALIDADO',FALSE,'EXTERNO',:cliente)"
        ), {"p": request.patente, "marca": request.marca, "modelo": request.modelo,
            "anio": request.anio, "color": request.color, "tipo": request.tipo_vehiculo,
            "precio": request.precio_diario, "cliente": request.cliente_id})
        conn.execute(text("UPDATE vehiculo_externo_solicitud SET estado='INCORPORADO', vehiculo_id=:vid "
                          "WHERE id=:id"), {"vid": result.lastrowid, "id": request_id})


class VehicleService(pb_grpc.VehicleServiceServicer):
    def ListVehicles(self, request, context):
        sql = f"SELECT {VEHICLE_COLUMNS} FROM vehiculo"
        if request.solo_activos:
            sql += " WHERE activo=TRUE"
        with engine.connect() as conn:
            rows = conn.execute(text(sql + " ORDER BY id")).fetchall()
        return pb.ListVehiclesResponse(vehiculos=[fila_a_vehicle(row) for row in rows])

    def GetVehicle(self, request, context):
        return pb.VehicleResponse(vehiculo=self._obtener(request.id, context))

    def GetVehicleByPlate(self, request, context):
        plate = normalizar_patente(request.patente)
        with engine.connect() as conn:
            row = conn.execute(text(f"SELECT {VEHICLE_COLUMNS} FROM vehiculo WHERE patente=:p"),
                               {"p": plate}).fetchone()
        if row is None:
            context.abort(grpc.StatusCode.NOT_FOUND, "No se encontró el vehículo especificado")
        return pb.VehicleResponse(vehiculo=fila_a_vehicle(row))

    def CheckAvailability(self, request, context):
        if request.HasField("fecha_inicio") and request.HasField("fecha_fin"):
            if request.fecha_fin.ToDatetime() <= request.fecha_inicio.ToDatetime():
                context.abort(grpc.StatusCode.INVALID_ARGUMENT, "La fecha de fin debe ser posterior al inicio")
        sql = (f"SELECT {VEHICLE_COLUMNS} FROM vehiculo WHERE activo=TRUE AND estado='DISPONIBLE' "
               "AND inhabilitado_por_robo=FALSE AND resultado_verificacion='VALIDADO'")
        params = {}
        f = request.filtros
        if f.tipo_vehiculo in TIPO_A_STR:
            sql += " AND tipo_vehiculo=:tipo"; params["tipo"] = TIPO_A_STR[f.tipo_vehiculo]
        if f.marca:
            sql += " AND LOWER(marca) LIKE :marca"; params["marca"] = f"%{f.marca.lower()}%"
        if f.modelo:
            sql += " AND LOWER(modelo) LIKE :modelo"; params["modelo"] = f"%{f.modelo.lower()}%"
        if f.precio_min_centavos > 0:
            sql += " AND precio_diario>=:pmin"; params["pmin"] = de_centavos(f.precio_min_centavos)
        if f.precio_max_centavos > 0:
            sql += " AND precio_diario<=:pmax"; params["pmax"] = de_centavos(f.precio_max_centavos)
        with engine.connect() as conn:
            rows = conn.execute(text(sql + " ORDER BY id"), params).fetchall()
        return pb.ListVehiclesResponse(vehiculos=[fila_a_vehicle(row) for row in rows])

    def CreateVehicle(self, request, context):
        validar_datos(context, request.patente, request.marca, request.modelo, request.anio,
                      request.tipo_vehiculo, request.precio_diario_centavos)
        try:
            with engine.begin() as conn:
                res = conn.execute(text(
                    "INSERT INTO vehiculo (patente,marca,modelo,anio,color,tipo_vehiculo,precio_diario) "
                    "VALUES (:p,:marca,:modelo,:anio,:color,:tipo,:precio)"),
                    {"p": normalizar_patente(request.patente), "marca": request.marca.strip(),
                     "modelo": request.modelo.strip(), "anio": request.anio, "color": request.color or None,
                     "tipo": TIPO_A_STR[request.tipo_vehiculo],
                     "precio": de_centavos(request.precio_diario_centavos)})
                vehicle_id = res.lastrowid
                publish_event("vehiculos.verificacion.solicitada",
                              {"vehiculoId": vehicle_id, "patente": normalizar_patente(request.patente)})
        except IntegrityError as exc:
            if getattr(exc.orig, "args", [None])[0] == 1062:
                context.abort(grpc.StatusCode.ALREADY_EXISTS, "La patente ya existe")
            raise
        except EventPublishError as exc:
            context.abort(grpc.StatusCode.UNAVAILABLE, str(exc))
        return pb.VehicleResponse(vehiculo=self._obtener(vehicle_id, context))

    def UpdateVehicle(self, request, context):
        vehicle = self._obtener(request.id, context)
        if vehicle.inhabilitado_por_robo and request.activo:
            context.abort(grpc.StatusCode.FAILED_PRECONDITION, "Un vehículo denunciado como robado no puede reactivarse")
        validar_datos(context, "", request.marca, request.modelo, request.anio,
                      request.tipo_vehiculo, request.precio_diario_centavos, validar_patente=False)
        with engine.begin() as conn:
            conn.execute(text("UPDATE vehiculo SET marca=:marca,modelo=:modelo,anio=:anio,color=:color,"
                               "tipo_vehiculo=:tipo,precio_diario=:precio,activo=:activo WHERE id=:id"),
                         {"marca": request.marca.strip(), "modelo": request.modelo.strip(),
                          "anio": request.anio, "color": request.color or None,
                          "tipo": TIPO_A_STR[request.tipo_vehiculo],
                          "precio": de_centavos(request.precio_diario_centavos),
                          "activo": request.activo, "id": request.id})
        return pb.VehicleResponse(vehiculo=self._obtener(request.id, context))

    def DeactivateVehicle(self, request, context):
        self._obtener(request.id, context)
        with engine.begin() as conn:
            conn.execute(text("UPDATE vehiculo SET activo=FALSE WHERE id=:id"), {"id": request.id})
        return pb.VehicleResponse(vehiculo=self._obtener(request.id, context))

    def UpdateVehicleStatus(self, request, context):
        vehicle = self._obtener(request.id, context)
        if request.estado not in ESTADO_A_STR:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "Estado de vehículo inválido")
        if not vehicle.activo or vehicle.inhabilitado_por_robo:
            context.abort(grpc.StatusCode.FAILED_PRECONDITION, "No se puede cambiar el estado de un vehículo inactivo o robado")
        with engine.begin() as conn:
            conn.execute(text("UPDATE vehiculo SET estado=:e WHERE id=:id"),
                         {"e": ESTADO_A_STR[request.estado], "id": request.id})
        return pb.VehicleResponse(vehiculo=self._obtener(request.id, context))

    def RegisterExternalVehicle(self, request, context):
        plate = normalizar_patente(request.patente)
        if request.cliente_id <= 0:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "cliente_id debe ser positivo")
        if not request.documento.strip() or len(request.documento.strip()) > 20:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "Documento obligatorio (máx. 20 caracteres)")
        validar_datos(context, plate, request.marca, request.modelo, request.anio,
                      request.tipo_vehiculo, request.precio_diario_centavos)
        try:
            with engine.begin() as conn:
                if conn.execute(text("SELECT id FROM vehiculo WHERE patente=:p"), {"p": plate}).first():
                    context.abort(grpc.StatusCode.ALREADY_EXISTS, "La patente ya está registrada")
                res = conn.execute(text(
                    "INSERT INTO vehiculo_externo_solicitud (cliente_id,documento,patente,marca,modelo,anio,"
                    "color,tipo_vehiculo,precio_diario) VALUES (:c,:d,:p,:marca,:modelo,:anio,:color,:tipo,:precio)"),
                    {"c": request.cliente_id, "d": request.documento.strip(), "p": plate,
                     "marca": request.marca.strip(), "modelo": request.modelo.strip(), "anio": request.anio,
                     "color": request.color or None, "tipo": TIPO_A_STR[request.tipo_vehiculo],
                     "precio": de_centavos(request.precio_diario_centavos)})
                request_id = res.lastrowid
                conn.execute(text("INSERT INTO vehiculo_externo_validacion "
                                  "(vehiculo_externo_id,tipo_validacion) VALUES (:id,'PATENTE'),(:id,'TITULARIDAD')"),
                             {"id": request_id})
                publish_event(EVENT_EXTERNAL_REGISTERED, {
                    "vehiculoExternoId": request_id, "clienteId": request.cliente_id,
                    "documento": request.documento.strip(), "patente": plate,
                })
                row = conn.execute(text("SELECT * FROM vehiculo_externo_solicitud WHERE id=:id"),
                                   {"id": request_id}).fetchone()
                result = fila_a_solicitud(conn, row)
        except IntegrityError as exc:
            if getattr(exc.orig, "args", [None])[0] == 1062:
                context.abort(grpc.StatusCode.ALREADY_EXISTS, "Ya existe una solicitud para esa patente")
            raise
        except EventPublishError as exc:
            context.abort(grpc.StatusCode.UNAVAILABLE, str(exc))
        return pb.ExternalVehicleRequestResponse(solicitud=result)

    def ListExternalVehicleRequests(self, request, context):
        if request.cliente_id <= 0:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "cliente_id debe ser positivo")
        with engine.connect() as conn:
            rows = conn.execute(text("SELECT * FROM vehiculo_externo_solicitud WHERE cliente_id=:c "
                                     "ORDER BY created_at DESC,id DESC"), {"c": request.cliente_id}).fetchall()
            requests = [fila_a_solicitud(conn, row) for row in rows]
        return pb.ListExternalVehicleRequestsResponse(solicitudes=requests)

    def _obtener(self, vehicle_id, context):
        row = _lookup_vehicle(vehicle_id)
        if row is None:
            context.abort(grpc.StatusCode.NOT_FOUND, "Vehículo no encontrado")
        return fila_a_vehicle(row)


def iniciar_consumidores():
    start_consumer("q.vehicle.verification.result", "vehicle.own-result", EVENT_OWN_RESULT,
                   procesar_resultado_verificacion)
    start_consumer("q.vehicle.external.plate.result", "vehicle.external-plate-result",
                   EVENT_PLATE_RESULT, lambda e: procesar_validacion_externa(e, "PATENTE"))
    start_consumer("q.vehicle.external.ownership.result", "vehicle.external-ownership-result",
                   EVENT_OWNERSHIP_RESULT, lambda e: procesar_validacion_externa(e, "TITULARIDAD"))
    start_consumer("q.vehicle.external.validation.completed", "vehicle.external-completed",
                   EVENT_EXTERNAL_COMPLETED, incorporar_solicitud_externa)


def serve():
    wait_for_db()
    iniciar_consumidores()
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    pb_grpc.add_VehicleServiceServicer_to_server(VehicleService(), server)
    server.add_insecure_port(f"[::]:{GRPC_PORT}")
    server.start()
    print(f"[vehicle-service] gRPC escuchando en :{GRPC_PORT}", flush=True)
    server.wait_for_termination()


if __name__ == "__main__":
    serve()
