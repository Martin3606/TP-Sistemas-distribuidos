"""RabbitMQ publisher and reconnecting manual-ack consumers for Verification."""

import json
import os
import time
import uuid
from datetime import datetime, timezone
from typing import Callable

import pika


EVENTS_EXCHANGE = "rentar.events"


class EventPublishError(RuntimeError):
    pass


def _parameters() -> pika.ConnectionParameters:
    credentials = pika.PlainCredentials(
        os.getenv("RABBITMQ_USER", "rentar"),
        os.getenv("RABBITMQ_PASSWORD", "rentar_dev"),
    )
    return pika.ConnectionParameters(
        host=os.getenv("RABBITMQ_HOST", "localhost"),
        port=int(os.getenv("RABBITMQ_PORT", "5672")),
        virtual_host=os.getenv("RABBITMQ_VHOST", "/"),
        credentials=credentials,
        heartbeat=30,
        blocked_connection_timeout=30,
        connection_attempts=1,
        socket_timeout=5,
    )


def publish_event(event_type: str, data: dict) -> str:
    event_id = str(uuid.uuid4())
    occurred_at = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace(
        "+00:00", "Z"
    )
    envelope = {
        "eventId": event_id,
        "eventType": event_type,
        "occurredAt": occurred_at,
        "data": data,
    }
    body = json.dumps(envelope, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    attempts = max(1, int(os.getenv("RABBITMQ_PUBLISH_ATTEMPTS", "3")))
    last_error = None

    for attempt in range(1, attempts + 1):
        connection = None
        try:
            connection = pika.BlockingConnection(_parameters())
            channel = connection.channel()
            channel.confirm_delivery()
            confirmed = channel.basic_publish(
                exchange=EVENTS_EXCHANGE,
                routing_key=event_type,
                body=body,
                properties=pika.BasicProperties(
                    content_type="application/json",
                    content_encoding="utf-8",
                    delivery_mode=pika.DeliveryMode.Persistent,
                    message_id=event_id,
                    type=event_type,
                    timestamp=int(datetime.now(timezone.utc).timestamp()),
                ),
                mandatory=True,
            )
            if confirmed is False:
                raise EventPublishError("RabbitMQ rechazó la publicación")
            print(f"[rabbitmq] publicado {event_type} eventId={event_id}", flush=True)
            return event_id
        except Exception as exc:
            last_error = exc
            print(f"[rabbitmq] error publicando {event_type} ({attempt}/{attempts}): {exc}", flush=True)
            if attempt < attempts:
                time.sleep(min(2 ** (attempt - 1), 5))
        finally:
            if connection is not None and connection.is_open:
                connection.close()

    raise EventPublishError(f"No se pudo publicar {event_type}: {last_error}") from last_error


def consume_forever(
    queue_name: str,
    consumer_name: str,
    expected_event_type: str,
    handler: Callable[[dict], None],
) -> None:
    while True:
        connection = None
        try:
            connection = pika.BlockingConnection(_parameters())
            channel = connection.channel()
            channel.basic_qos(prefetch_count=1)

            def dispatch(ch, method, properties, body):
                attempts = max(1, int(os.getenv("RABBITMQ_CONSUMER_ATTEMPTS", "3")))
                for attempt in range(1, attempts + 1):
                    try:
                        event = json.loads(body.decode("utf-8"))
                        if event.get("eventType") != expected_event_type:
                            raise ValueError("eventType no coincide con la cola consumida")
                        if not event.get("eventId") or not isinstance(event.get("data"), dict):
                            raise ValueError("Sobre de evento incompleto")
                        handler(event)
                        ch.basic_ack(delivery_tag=method.delivery_tag)
                        return
                    except Exception as exc:
                        print(
                            f"[{consumer_name}] error ({attempt}/{attempts}): {exc}",
                            flush=True,
                        )
                        if attempt < attempts:
                            time.sleep(min(2 ** (attempt - 1), 5))
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

            channel.basic_consume(queue=queue_name, on_message_callback=dispatch, auto_ack=False)
            print(f"[{consumer_name}] escuchando {queue_name}", flush=True)
            channel.start_consuming()
        except Exception as exc:
            print(f"[{consumer_name}] conexión RabbitMQ perdida; reintento: {exc}", flush=True)
            time.sleep(float(os.getenv("RABBITMQ_RECONNECT_DELAY_SECONDS", "3")))
        finally:
            if connection is not None and connection.is_open:
                connection.close()
