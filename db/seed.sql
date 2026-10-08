-- Datos de prueba para poder probar el endpoint de Alta de Reserva
-- sin depender de que ya existan los ABM de Cliente y Vehiculo.
-- Correr solo en entorno de desarrollo/pruebas.

USE rentar;

INSERT INTO cliente (documento, nombre, apellido, email, telefono, fecha_nacimiento, activo)
VALUES
  ('30111222', 'Juan', 'Perez', 'juan.perez@mail.com', '1150001111', '1990-05-10', TRUE),
  ('30222333', 'Ana', 'Gomez', 'ana.gomez@mail.com', '1150002222', '1988-11-20', FALSE);
  -- el segundo cliente queda INACTIVO a propósito, para probar esa validación

INSERT INTO vehiculo (patente, marca, modelo, anio, color, tipo_vehiculo, precio_diario, estado, activo)
VALUES
  ('AB123CD', 'Toyota', 'Corolla', 2022, 'Gris', 'SEDAN', 15000.00, 'DISPONIBLE', TRUE),
  ('EF456GH', 'Ford', 'Ranger', 2021, 'Blanco', 'PICKUP', 22000.00, 'DISPONIBLE', FALSE);
  -- el segundo vehículo queda INACTIVO a propósito, para probar esa validación

-- Usuarios iniciales para Autenticación (password admin: admin123, password cliente: cliente123)
INSERT INTO usuario (email, password_hash, rol, cliente_id)
VALUES
  ('admin@rentar.com', '$2b$12$m7NC0aA2o9TRN2Pgk3mTBuWS1YXLY2x4FS/2KpqqfUFB6wXYvOzIe', 'ADMIN', NULL),
  ('juan.perez@mail.com', '$2b$12$Im66T/aCL4/v0egDINziDe6BR8i/qjFqzeJLeHEa3XvSXVQbn/CrG', 'CLIENTE', 1);

