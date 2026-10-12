-- Datos de prueba Hito 2 (una base por servicio). Solo desarrollo.
-- Correr UNA vez, con las bases ya creadas por db/init.sql:
--   docker cp seed_hito2.sql rentar-mysql:/tmp/seed_hito2.sql
--   docker exec -i rentar-mysql sh -c "mysql -uroot -proot < /tmp/seed_hito2.sql"
-- Contraseñas: admin123 (admin) / cliente123 (juan.perez)

USE db_clientes;
INSERT INTO cliente (documento, nombre, apellido, email, telefono, fecha_nacimiento, activo) VALUES
  ('30111222', 'Juan', 'Perez', 'juan.perez@mail.com', '1150001111', '1990-05-10', TRUE),
  ('30222333', 'Ana',  'Gomez', 'ana.gomez@mail.com',  '1150002222', '1988-11-20', FALSE);
-- Ana queda INACTIVA a propósito, para probar el rechazo de reservas.

INSERT INTO usuario (email, password_hash, rol, cliente_id) VALUES
  ('admin@rentar.com',    '$2b$12$m7NC0aA2o9TRN2Pgk3mTBuWS1YXLY2x4FS/2KpqqfUFB6wXYvOzIe', 'ADMIN',   NULL),
  ('juan.perez@mail.com', '$2b$12$Im66T/aCL4/v0egDINziDe6BR8i/qjFqzeJLeHEa3XvSXVQbn/CrG', 'CLIENTE', 1);

USE db_vehiculos;
INSERT INTO vehiculo (patente, marca, modelo, anio, color, tipo_vehiculo, precio_diario, estado, activo) VALUES
  ('AB123CD', 'Toyota', 'Corolla', 2022, 'Gris',   'SEDAN',  15000.00, 'DISPONIBLE', TRUE),
  ('IJ789KL', 'Honda',  'HR-V',    2023, 'Negro',  'SUV',    20000.00, 'DISPONIBLE', TRUE),
  ('EF456GH', 'Ford',   'Ranger',  2021, 'Blanco', 'PICKUP', 22000.00, 'DISPONIBLE', FALSE);
-- La Ranger queda INACTIVA a propósito.
