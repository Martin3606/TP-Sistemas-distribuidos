-- Muestra el estado actual de las 3 tablas.
-- Uso: docker exec -i rentar-mysql mysql -u rentar_user -prentar_pass rentar < db/ver_datos.sql

USE rentar;

SELECT '--- CLIENTES ---' AS ' ';
SELECT id, documento, nombre, apellido, email, activo FROM cliente;

SELECT '--- VEHICULOS ---' AS ' ';
SELECT id, patente, marca, modelo, tipo_vehiculo, precio_diario, estado, activo FROM vehiculo;

SELECT '--- RESERVAS ---' AS ' ';
SELECT id, cliente_id, vehiculo_id, fecha_inicio, fecha_fin, importe_total, estado FROM reserva;
