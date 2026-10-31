"""Consumers for simulated theft and external ownership checks."""

import os
import re
import threading
import time

from sqlalchemy import text

from db import engine, wait_for_db
from messaging import consume_forever, publish_event


QUEUE_OWN_VEHICLE = "q.vehicle.verification.requested"
QUEUE_EXTERNAL_PLATE = "q.verification.external.registered.plate"
QUEUE_EXTERNAL_OWNERSHIP = "q.verification.external.registered.ownership"

EVENT_OWN_REQUESTED = "vehiculos.verificacion.solicitada"
EVENT_OWN_RESULT = "vehiculos.verificacion.resultado"
EVENT_EXTERNAL_REGISTERED = "vehiculos.externos.registrados"
EVENT_PLATE_RESULT = "vehiculos.externos.validacion.patente"
EVENT_OWNERSHIP_RESULT = "vehiculos.externos.validacion.titularidad"

SIMULATED_DELAY_SECONDS = max(0.0, float(os.getenv("VERIFICATION_DELAY_SECONDS", "2")))


def normalizar_patente(patente: str) -> str:
    return re.sub(r"\s+", "", patente or "").upper()


def esperar_demora() -> None:
    if SIMULATED_DELAY_SECONDS:
        time.sleep(SIMULATED_DELAY_SECONDS)


def ya_procesado(conn, consumer_name: str, event_id: str) -> bool:
    result = conn.execute(
        text(
            "INSERT IGNORE INTO evento_procesado (consumidor, event_id) "
            "VALUES (:consumer, :event_id)"
        ),
        {"consumer": consumer_name, "event_id": event_id},
    )
    return result.rowcount == 0


def verificar_vehiculo_propio(event: dict) -> None:
    data = event["data"]
    vehicle_id = int(data["vehiculoId"])
    plate = normalizar_patente(data["patente"])
    if vehicle_id <= 0 or not plate:
        raise ValueError("vehiculoId y patente son obligatorios")
    esperar_demora()

    with engine.begin() as conn:
        if ya_procesado(conn, "verification.own-vehicle", event["eventId"]):
            return
        vehicle = conn.execute(
            text("SELECT patente FROM vehiculo WHERE id = :id FOR UPDATE"),
            {"id": vehicle_id},
        ).fetchone()
        if vehicle is None or normalizar_patente(vehicle.patente) != plate:
            raise ValueError("No coincide el vehículo registrado con el evento")
        stolen = conn.execute(
            text("SELECT 1 FROM registro_robos WHERE patente = :patente"),
            {"patente": plate},
        ).first() is not None
        result = "ROBADO" if stolen else "VALIDADO"
        publish_event(
            EVENT_OWN_RESULT,
            {"vehiculoId": vehicle_id, "patente": plate, "resultado": result},
        )
        print(f"[verification] vehículo {vehicle_id} patente {plate}: {result}", flush=True)


def validar_patente_externa(event: dict) -> None:
    data = event["data"]
    request_id = int(data["vehiculoExternoId"])
    plate = normalizar_patente(data["patente"])
    if request_id <= 0 or not plate:
        raise ValueError("vehiculoExternoId y patente son obligatorios")
    esperar_demora()

    with engine.begin() as conn:
        if ya_procesado(conn, "verification.external-plate", event["eventId"]):
            return
        stolen = conn.execute(
            text("SELECT 1 FROM registro_robos WHERE patente = :patente"),
            {"patente": plate},
        ).first() is not None
        result = "RECHAZADO" if stolen else "VALIDADO"
        publish_event(
            EVENT_PLATE_RESULT,
            {
                "vehiculoExternoId": request_id,
                "patente": plate,
                "resultado": result,
            },
        )
        print(f"[verification] patente externa {request_id}: {result}", flush=True)


def validar_titularidad_externa(event: dict) -> None:
    data = event["data"]
    request_id = int(data["vehiculoExternoId"])
    client_id = int(data["clienteId"])
    document = str(data["documento"]).strip()
    plate = normalizar_patente(data["patente"])
    if request_id <= 0 or client_id <= 0 or not document or not plate:
        raise ValueError("Solicitud de titularidad incompleta")
    esperar_demora()

    with engine.begin() as conn:
        if ya_procesado(conn, "verification.external-ownership", event["eventId"]):
            return
        owner = conn.execute(
            text("SELECT documento FROM registro_titularidad WHERE patente = :patente"),
            {"patente": plate},
        ).fetchone()
        
        # Si la patente no existe en el padrón simulado, la registramos a nombre del cliente actual
        if owner is None:
            conn.execute(
                text("INSERT INTO registro_titularidad (patente, documento) VALUES (:patente, :documento)"),
                {"patente": plate, "documento": document},
            )
            result = "VALIDADO"
        elif str(owner.documento).strip() == document:
            result = "VALIDADO"
        else:
            result = "RECHAZADO"

        publish_event(
            EVENT_OWNERSHIP_RESULT,
            {
                "vehiculoExternoId": request_id,
                "clienteId": client_id,
                "documento": document,
                "patente": plate,
                "resultado": result,
            },
        )
        print(f"[verification] titularidad externa {request_id}: {result}", flush=True)


def start_worker(queue: str, name: str, event_type: str, handler) -> threading.Thread:
    thread = threading.Thread(
        target=consume_forever,
        args=(queue, name, event_type, handler),
        name=name,
        daemon=True,
    )
    thread.start()
    return thread


def serve() -> None:
    wait_for_db()
    start_worker(QUEUE_OWN_VEHICLE, "verification.own-vehicle", EVENT_OWN_REQUESTED,
                 verificar_vehiculo_propio)
    start_worker(QUEUE_EXTERNAL_PLATE, "verification.external-plate", EVENT_EXTERNAL_REGISTERED,
                 validar_patente_externa)
    start_worker(QUEUE_EXTERNAL_OWNERSHIP, "verification.external-ownership",
                 EVENT_EXTERNAL_REGISTERED, validar_titularidad_externa)
    print(
        f"[verification-service] consumidores activos; demora simulada="
        f"{SIMULATED_DELAY_SECONDS}s",
        flush=True,
    )
    threading.Event().wait()


if __name__ == "__main__":
    serve()