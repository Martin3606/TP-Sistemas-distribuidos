-- Borra las reservas de prueba para volver a testear desde cero.
-- OJO: por defecto solo limpia `reserva`, no toca `cliente` ni `vehiculo`
-- porque esas tablas las manejan tus compañeros (con sus propios ABM/datos)
-- y no queremos pisarles el trabajo sin querer.
--
-- Uso: docker exec -i rentar-mysql mysql -u rentar_user -prentar_pass rentar < db/limpiar_datos.sql

USE rentar;

DELETE FROM reserva;
ALTER TABLE reserva AUTO_INCREMENT = 1;

-- Si en algún momento necesitás resetear TAMBIÉN cliente y vehiculo
-- (por ejemplo para recargar el seed.sql desde cero), descomentá esto:
--
-- SET FOREIGN_KEY_CHECKS = 0;
-- TRUNCATE TABLE cliente;
-- TRUNCATE TABLE vehiculo;
-- SET FOREIGN_KEY_CHECKS = 1;
