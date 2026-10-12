-- Datos de prueba Hito 2 (una base por servicio). Solo desarrollo.
-- Correr UNA vez, con las bases ya creadas por db/init.sql:
--   docker cp seed_hito2.sql rentar-mysql:/tmp/seed_hito2.sql
--   docker exec -i rentar-mysql sh -c "mysql -uroot -proot < /tmp/seed_hito2.sql"
-- Contraseñas: admin123 (admin) / cliente123 (juan.perez)

USE db_clientes;
INSERT INTO cliente (documento, nombre, apellido, email, telefono, fecha_nacimiento, activo) VALUES
  ('30111222', 'Juan', 'Perez', 'juan.perez@mail.com', '1150001111', '1990-05-10', TRUE),
  ('30222333', 'Ana',  'Gomez', 'ana.gomez@mail.com',  '1150002222', '1988-11-20', FALSE)
-- Ana queda INACTIVA a propósito, para probar el rechazo de reservas.
-- Hace que el seed se pueda volver a correr sin duplicar clientes.
ON DUPLICATE KEY UPDATE
  nombre = VALUES(nombre), apellido = VALUES(apellido), telefono = VALUES(telefono),
  fecha_nacimiento = VALUES(fecha_nacimiento), activo = VALUES(activo);

INSERT INTO usuario (email, password_hash, rol, cliente_id) VALUES
  ('admin@rentar.com',    '$2b$12$HkpvfpOJRYJRw6tj8w85Q.I.ON9G7pWJkNFlMDuu6KTYoRQdAflni', 'ADMIN',   NULL),
  ('juan.perez@mail.com', '$2b$12$MpC4kFyilNNHcrJ8CJnFG.4Njws2OSZO.081mpd4Vn7rbMnbYyac.', 'CLIENTE', (SELECT id FROM cliente WHERE email = 'juan.perez@mail.com'))
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash), rol = VALUES(rol), cliente_id = VALUES(cliente_id);

USE db_vehiculos;
INSERT INTO vehiculo (patente, marca, modelo, anio, color, tipo_vehiculo, precio_diario, estado, activo) VALUES
  ('AB123CD', 'Toyota', 'Corolla', 2022, 'Gris',   'SEDAN',  15000.00, 'DISPONIBLE', TRUE),
  ('IJ789KL', 'Honda',  'HR-V',    2023, 'Negro',  'SUV',    20000.00, 'DISPONIBLE', TRUE),
  ('EF456GH', 'Ford',   'Ranger',  2021, 'Blanco', 'PICKUP', 22000.00, 'DISPONIBLE', FALSE);
-- La Ranger queda INACTIVA a propósito.
