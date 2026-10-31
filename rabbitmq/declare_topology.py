"""Create Rentar's durable RabbitMQ exchanges, queues and bindings."""

import os
import time

import pika


EVENTS_EXCHANGE = "rentar.events"
DLX_EXCHANGE = "rentar.events.dlx"
DLQ = "q.rentar.events.dlq"
DEAD_ROUTING_KEY = "dead"

# Each business consumer owns a queue. The two external-vehicle checks have
# separate queues so they can run independently and at their own pace.
CONSUMER_QUEUES = {
    "q.vehicle.verification.requested": "vehiculos.verificacion.solicitada",
    "q.vehicle.verification.result": "vehiculos.verificacion.resultado",
    "q.verification.external.registered.plate": "vehiculos.externos.registrados",
    "q.verification.external.registered.ownership": "vehiculos.externos.registrados",
    "q.vehicle.external.plate.result": "vehiculos.externos.validacion.patente",
    "q.vehicle.external.ownership.result": "vehiculos.externos.validacion.titularidad",
    "q.vehicle.external.validation.completed": "vehiculos.externos.validacion.completada",
    "q.maintenance.reservation.confirmed": "reserva.confirmada",
    "q.rental.maintenance.result": "mantenimiento.resultado",
}


def connect_with_retry(parameters: pika.ConnectionParameters) -> pika.BlockingConnection:
    attempts = int(os.getenv("RABBITMQ_CONNECT_ATTEMPTS", "30"))
    for attempt in range(1, attempts + 1):
        try:
            return pika.BlockingConnection(parameters)
        except pika.exceptions.AMQPConnectionError:
            if attempt == attempts:
                raise
            print(f"RabbitMQ no disponible; reintento {attempt}/{attempts}", flush=True)
            time.sleep(2)
    raise RuntimeError("No se pudo conectar con RabbitMQ")


def declare_topology() -> None:
    credentials = pika.PlainCredentials(
        os.getenv("RABBITMQ_USER", "rentar"),
        os.getenv("RABBITMQ_PASSWORD", "rentar_dev"),
    )
    parameters = pika.ConnectionParameters(
        host=os.getenv("RABBITMQ_HOST", "localhost"),
        port=int(os.getenv("RABBITMQ_PORT", "5672")),
        virtual_host=os.getenv("RABBITMQ_VHOST", "/"),
        credentials=credentials,
        heartbeat=30,
        blocked_connection_timeout=30,
    )

    connection = connect_with_retry(parameters)
    try:
        channel = connection.channel()
        channel.exchange_declare(exchange=EVENTS_EXCHANGE, exchange_type="topic", durable=True)
        channel.exchange_declare(exchange=DLX_EXCHANGE, exchange_type="topic", durable=True)

        channel.queue_declare(queue=DLQ, durable=True)
        channel.queue_bind(queue=DLQ, exchange=DLX_EXCHANGE, routing_key=DEAD_ROUTING_KEY)

        for queue_name, routing_key in CONSUMER_QUEUES.items():
            channel.queue_declare(
                queue=queue_name,
                durable=True,
                arguments={
                    "x-dead-letter-exchange": DLX_EXCHANGE,
                    "x-dead-letter-routing-key": DEAD_ROUTING_KEY,
                },
            )
            channel.queue_bind(
                queue=queue_name,
                exchange=EVENTS_EXCHANGE,
                routing_key=routing_key,
            )
        print(
            f"Topología lista: {EVENTS_EXCHANGE}, {DLX_EXCHANGE}, "
            f"{len(CONSUMER_QUEUES) + 1} colas durables.",
            flush=True,
        )
    finally:
        connection.close()


if __name__ == "__main__":
    declare_topology()
