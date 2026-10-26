-- Datos de prueba para los flujos asíncronos del Hito 3.
-- Ejecutar después de db-dev/seed_hito2.sql y db-dev/migracion_hito3.sql
-- (en una base nueva, docker compose up crea el esquema actualizado).
-- Uso desde la raíz del repositorio:
-- docker cp db-dev/seed_hito3.sql rentar-mysql:/tmp/seed_hito3.sql
-- docker exec -i rentar-mysql sh -c "mysql -uroot -proot < /tmp/seed_hito3.sql"

USE db_vehiculos;

-- Los vehículos preexistentes aprobados por el Hito 2 quedan habilitados.
UPDATE vehiculo
   SET resultado_verificacion = 'VALIDADO', inhabilitado_por_robo = FALSE
 WHERE patente IN ('AB123CD', 'IJ789KL', 'EF456GH');

-- Patente denunciada y patente con titularidad incorrecta para ensayar rechazos.
INSERT INTO registro_robos (patente, observacion) VALUES
  ('AAA111', 'Registro simulado de vehículo denunciado como robado')
ON DUPLICATE KEY UPDATE observacion = VALUES(observacion);

INSERT INTO registro_titularidad (patente, documento, titular) VALUES
  ('QR123ST', '30111222', 'Juan Perez'),
  ('GHI789',  '99999999', 'Titular simulado distinto al cliente')
ON DUPLICATE KEY UPDATE documento = VALUES(documento), titular = VALUES(titular);

-- Solicitud externa de ejemplo en PENDIENTE para un cliente seed.
INSERT INTO vehiculo_externo_solicitud
    (cliente_id, documento, patente, marca, modelo, anio, color,
     tipo_vehiculo, precio_diario, estado)
SELECT c.id, c.documento, 'QR123ST', 'Chevrolet', 'Onix', 2022, 'Azul',
       'HATCHBACK', 18000.00, 'PENDIENTE'
  FROM db_clientes.cliente c
 WHERE c.email = 'juan.perez@mail.com'
ON DUPLICATE KEY UPDATE
    cliente_id = VALUES(cliente_id), documento = VALUES(documento),
    marca = VALUES(marca), modelo = VALUES(modelo), anio = VALUES(anio),
    color = VALUES(color), tipo_vehiculo = VALUES(tipo_vehiculo),
    precio_diario = VALUES(precio_diario), estado = 'PENDIENTE';

INSERT INTO vehiculo_externo_validacion (vehiculo_externo_id, tipo_validacion, resultado)
SELECT s.id, v.tipo_validacion, 'PENDIENTE'
  FROM vehiculo_externo_solicitud s
 CROSS JOIN (
       SELECT 'PATENTE' AS tipo_validacion
       UNION ALL
       SELECT 'TITULARIDAD'
  ) v
 WHERE s.patente = 'QR123ST'
ON DUPLICATE KEY UPDATE resultado = 'PENDIENTE';
