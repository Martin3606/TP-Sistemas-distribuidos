import pika
import mysql.connector
import json
import os
import time
import random

# Variables de entorno
DB_HOST = os.getenv('DB_HOST', 'mysql-db')
DB_PORT = int(os.getenv('DB_PORT', 3306))
DB_USER = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'root')
DB_NAME = os.getenv('DB_NAME', 'db_mantenimiento')

RABBIT_HOST = os.getenv('RABBITMQ_HOST', 'rabbitmq')
RABBIT_PORT = int(os.getenv('RABBITMQ_PORT', 5672))
RABBIT_USER = os.getenv('RABBITMQ_USER', 'rentar')
RABBIT_PASS = os.getenv('RABBITMQ_PASSWORD', 'rentar_dev')
DELAY = int(os.getenv('MAINTENANCE_DELAY_SECONDS', 3))

def get_db_connection():
    return mysql.connector.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME
    )

def procesar_mantenimiento(ch, method, properties, body):
    try:
        evento = json.loads(body)
        reserva_id = evento.get('reservaId')
        vehiculo_id = evento.get('vehiculoId')
        # Reemplazamos la 'T' del ISO format por un espacio para que MySQL lo procese directo como DATETIME
        fecha_inicio = evento.get('fechaInicio').replace('T', ' ')
        fecha_fin = evento.get('fechaFin').replace('T', ' ')
        
        print(f"[*] Solicitud recibida para Reserva ID: {reserva_id}, Vehículo ID: {vehiculo_id}")

        # 1. Registrar la solicitud inicial en la base de datos
        db = get_db_connection()
        cursor = db.cursor()
        
        insert_query = """
            INSERT INTO solicitud_mantenimiento (reserva_id, vehiculo_id, fecha_inicio, fecha_fin) 
            VALUES (%s, %s, %s, %s)
        """
        # Nota: 'resultado' toma 'PENDIENTE' por defecto y 'solicitado_at' el CURRENT_TIMESTAMP
        cursor.execute(insert_query, (reserva_id, vehiculo_id, fecha_inicio, fecha_fin))
        solicitud_id = cursor.lastrowid
        db.commit()
        print(f"[*] Solicitud guardada en BD con resultado PENDIENTE (ID Mantenimiento: {solicitud_id})")

        # 2. Simular el procesamiento asíncrono
        time.sleep(DELAY)
        
        # 3. Definir el resultado (90% de probabilidad de que se realice exitosamente)
        resultado_final = "REALIZADO" if random.random() < 0.9 else "NO_REALIZADO"
        
        # 4. Actualizar el resultado y la fecha de procesamiento en la base de datos
        update_query = """
            UPDATE solicitud_mantenimiento 
            SET resultado = %s, procesado_at = CURRENT_TIMESTAMP 
            WHERE id = %s
        """
        cursor.execute(update_query, (resultado_final, solicitud_id))
        db.commit()
        cursor.close()
        db.close()
        print(f"[*] Mantenimiento procesado. Resultado: {resultado_final}")

        # 5. Publicar el evento de respuesta
        evento_resultado = {
            "reservaId": reserva_id,
            "vehiculoId": vehiculo_id,
            "resultado": resultado_final
        }
        
        ch.basic_publish(
            exchange='rentar.events',
            routing_key='mantenimiento.resultado',
            body=json.dumps(evento_resultado),
            properties=pika.BasicProperties(
                delivery_mode=2, # Hacer el mensaje persistente
                content_type='application/json'
            )
        )
        print(f"[x] Evento mantenimiento.resultado publicado exitosamente.")
        
        # Confirmar a RabbitMQ que el mensaje fue procesado correctamente
        ch.basic_ack(delivery_tag=method.delivery_tag)

    except Exception as e:
        print(f"[!] Error procesando el mensaje: {e}")
        # En caso de error, rechazamos el mensaje (para que vaya a la DLX definida en la topología)
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

def main():
    # Esperar a que RabbitMQ esté listo
    time.sleep(10)
    
    credentials = pika.PlainCredentials(RABBIT_USER, RABBIT_PASS)
    parameters = pika.ConnectionParameters(RABBIT_HOST, RABBIT_PORT, '/', credentials)
    
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()

    # Consumir de la cola específica de mantenimiento (topología del Hito 3)
    queue_name = 'q.maintenance.reservation.confirmed'
    channel.queue_declare(queue=queue_name, durable=True)
    channel.queue_bind(exchange='rentar.events', queue=queue_name, routing_key='reserva.confirmada')

    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=queue_name, on_message_callback=procesar_mantenimiento)

    print(' [*] Maintenance Service iniciado. Esperando eventos de reserva.confirmada...')
    channel.start_consuming()

if __name__ == '__main__':
    main()