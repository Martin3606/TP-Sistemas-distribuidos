# Eventos de Rentar

Los eventos se publican en el exchange durable `rentar.events` (tipo `topic`). Cada mensaje usa JSON UTF-8, `content_type=application/json`, entrega persistente y el siguiente sobre común:

```json
{
  "eventId": "uuid-v4",
  "eventType": "vehiculos.verificacion.solicitada",
  "occurredAt": "2026-10-26T12:00:00Z",
  "data": {}
}
```

`eventId` identifica de forma única una publicación lógica; debe conservarse en los reintentos. `eventType` debe coincidir con la routing key. `occurredAt` es fecha/hora UTC en ISO 8601. Los consumidores deben ignorar duplicados de un mismo `eventId`, ya que la entrega es al menos una vez. `data` contiene los campos del evento indicados abajo. Los valores de resultado son exactos y sensibles a mayúsculas.

## Catálogo de eventos

| `eventType` / routing key | Publica | Consumidor(es) | Datos (`data`) |
| --- | --- | --- | --- |
| `vehiculos.verificacion.solicitada` | Vehicle Service al registrar un vehículo propio | Verification Service | `vehiculoId`, `patente` |
| `vehiculos.verificacion.resultado` | Verification Service | Vehicle Service | `vehiculoId`, `patente`, `resultado`: `VALIDADO` o `ROBADO` |
| `vehiculos.externos.registrados` | Vehicle Service al aceptar la solicitud | Verification Service, validación de patente y validación de titularidad, cada una en su propia cola | `vehiculoExternoId`, `clienteId`, `documento`, `patente` |
| `vehiculos.externos.validacion.patente` | Verification Service | Vehicle Service | `vehiculoExternoId`, `patente`, `resultado`: `VALIDADO` o `RECHAZADO` |
| `vehiculos.externos.validacion.titularidad` | Verification Service | Vehicle Service | `vehiculoExternoId`, `clienteId`, `documento`, `patente`, `resultado`: `VALIDADO` o `RECHAZADO` |
| `vehiculos.externos.validacion.completada` | Vehicle Service cuando ambas validaciones fueron satisfactorias | Sin consumidor definido en el alcance actual | `vehiculoExternoId` |
| `reserva.confirmada` | Rental Service después de confirmar la reserva | Maintenance Service | `reservaId`, `vehiculoId`, `fechaInicio`, `fechaFin` |
| `mantenimiento.resultado` | Maintenance Service | Rental Service | `reservaId`, `vehiculoId`, `resultado`: `REALIZADO` o `NO_REALIZADO` |

### Ejemplos de payloads

Los ejemplos muestran el objeto `data`; el productor lo envuelve con los tres campos comunes del sobre.

```json
{"vehiculoId":15,"patente":"ABC123"}
```

```json
{"vehiculoId":15,"patente":"ABC123","resultado":"VALIDADO"}
```

```json
{"vehiculoExternoId":50,"clienteId":89,"documento":"30123456","patente":"DEF456"}
```

```json
{"vehiculoExternoId":50,"patente":"DEF456","resultado":"VALIDADO"}
```

```json
{"vehiculoExternoId":50,"clienteId":89,"documento":"30123456","patente":"DEF456","resultado":"VALIDADO"}
```

```json
{"vehiculoExternoId":50}
```

```json
{"reservaId":150,"vehiculoId":15,"fechaInicio":"2026-10-10T10:00:00","fechaFin":"2026-10-15T10:00:00"}
```

```json
{"reservaId":150,"vehiculoId":15,"resultado":"REALIZADO"}
```

## Colas y bindings

El script `rabbitmq/declare_topology.py` declara estas nueve colas de negocio durables y sus bindings. Cada consumidor usa ack manual.

| Cola | Routing key | Consumidor |
| --- | --- | --- |
| `q.vehicle.verification.requested` | `vehiculos.verificacion.solicitada` | Verification Service |
| `q.vehicle.verification.result` | `vehiculos.verificacion.resultado` | Vehicle Service |
| `q.verification.external.registered.plate` | `vehiculos.externos.registrados` | Verification Service: patente |
| `q.verification.external.registered.ownership` | `vehiculos.externos.registrados` | Verification Service: titularidad |
| `q.vehicle.external.plate.result` | `vehiculos.externos.validacion.patente` | Vehicle Service: resultado de patente |
| `q.vehicle.external.ownership.result` | `vehiculos.externos.validacion.titularidad` | Vehicle Service: resultado de titularidad |
| `q.vehicle.external.validation.completed` | `vehiculos.externos.validacion.completada` | Vehicle Service: finalización de incorporación |
| `q.maintenance.reservation.confirmed` | `reserva.confirmada` | Maintenance Service |
| `q.rental.maintenance.result` | `mantenimiento.resultado` | Rental Service |

Las verificaciones de patente y titularidad reciben copias independientes del evento porque tienen queues distintas enlazadas al mismo exchange y routing key. Después de publicar `vehiculos.externos.validacion.completada`, Vehicle Service consume su propia cola para completar la incorporación de forma asíncrona; la acción final debe ser idempotente por `eventId` y `vehiculoExternoId`.

## Fallos, reintentos e idempotencia

1. Los consumidores usan `auto_ack=false` y confirman (`basic.ack`) solo después de completar el procesamiento durable.
2. Ante un error transitorio, el consumidor reintenta en el proceso un máximo de tres veces, con espera exponencial acotada. No debe hacer `nack(requeue=true)` indefinidamente, para evitar ciclos rápidos de redelivery.
3. Agotados los reintentos, rechaza con `basic.nack(requeue=false)`. Cada cola de negocio está configurada para dead-letter hacia `rentar.events.dlx`, routing key `dead`; el mensaje termina en `q.rentar.events.dlq` sin regresar al flujo normal.
4. La entrega es al menos una vez: cada consumidor registra el `eventId` procesado en la misma transacción que sus cambios de negocio, o usa una restricción única equivalente. Si el identificador ya fue aplicado, confirma el mensaje sin repetir el efecto.
5. Un mensaje de la DLQ se inspecciona y se corrige antes de reproducirlo. La reproducción conserva `eventId` para que la idempotencia prevenga efectos duplicados.

Los productores deben marcar el mensaje como persistente y esperar publisher confirms. El DLQ no tiene dead-letter configurado y requiere intervención para reencolar; así se evita un ciclo de mensajes fallidos.
