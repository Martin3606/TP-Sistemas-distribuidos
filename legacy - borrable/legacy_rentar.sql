-- Base LEGACY del Hito 1 (solo para backend-graphql / backend-rest)
CREATE USER IF NOT EXISTS 'rentar_user'@'%' IDENTIFIED BY 'rentar_pass';
-- =========================================================
-- Rentar - Modelo de datos (Hito 1: REST / GraphQL)
-- Motor: MySQL 8.x
-- =========================================================

CREATE DATABASE IF NOT EXISTS rentar
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE rentar;

-- =========================================================
-- Tabla: cliente
-- =========================================================
CREATE TABLE IF NOT EXISTS cliente (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    documento           VARCHAR(20)  NOT NULL,
    nombre              VARCHAR(100) NOT NULL,
    apellido            VARCHAR(100) NOT NULL,
    email               VARCHAR(150) NOT NULL,
    telefono            VARCHAR(30),
    fecha_nacimiento    DATE,
    activo              BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                     ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_cliente_documento UNIQUE (documento),
    CONSTRAINT uq_cliente_email     UNIQUE (email)
) ENGINE=InnoDB;

-- =========================================================
-- Tabla: vehiculo
-- =========================================================
CREATE TABLE IF NOT EXISTS vehiculo (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    patente         VARCHAR(10)  NOT NULL,
    marca           VARCHAR(60)  NOT NULL,
    modelo          VARCHAR(60)  NOT NULL,
    anio            SMALLINT     NOT NULL,
    color           VARCHAR(30),
    tipo_vehiculo   ENUM('SEDAN','SUV','PICKUP','COUPE','HATCHBACK') NOT NULL,
    precio_diario   DECIMAL(10,2) NOT NULL,
    estado          ENUM('DISPONIBLE','RESERVADO','EN_ALQUILER')
                    NOT NULL DEFAULT 'DISPONIBLE',
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                 ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_vehiculo_patente UNIQUE (patente),
    CONSTRAINT chk_vehiculo_precio CHECK (precio_diario > 0),
    CONSTRAINT chk_vehiculo_anio   CHECK (anio >= 1990)
) ENGINE=InnoDB;

-- =========================================================
-- Tabla: reserva
-- =========================================================
CREATE TABLE IF NOT EXISTS reserva (
    id                      INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id              INT NOT NULL,
    vehiculo_id             INT NOT NULL,
    fecha_inicio            DATETIME NOT NULL,
    fecha_fin               DATETIME NOT NULL,
    precio_diario_snapshot  DECIMAL(10,2) NOT NULL,
    importe_total           DECIMAL(10,2) NOT NULL,
    estado                  ENUM('CONFIRMADA','CANCELADA','FINALIZADA')
                            NOT NULL DEFAULT 'CONFIRMADA',
    created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                                     ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_reserva_cliente
        FOREIGN KEY (cliente_id)  REFERENCES cliente(id),
    CONSTRAINT fk_reserva_vehiculo
        FOREIGN KEY (vehiculo_id) REFERENCES vehiculo(id),
    CONSTRAINT chk_reserva_fechas CHECK (fecha_fin > fecha_inicio)
) ENGINE=InnoDB;

-- Índice compuesto: acelera el chequeo de disponibilidad
-- (buscar reservas activas de un vehículo que se solapen con un rango)
CREATE INDEX idx_reserva_disponibilidad
    ON reserva (vehiculo_id, estado, fecha_inicio, fecha_fin);

-- Índice para "mis reservas" del cliente
CREATE INDEX idx_reserva_cliente
    ON reserva (cliente_id, estado);

-- =========================================================
-- Tabla: usuario (Autenticación y Roles: ADMIN / CLIENTE)
-- =========================================================
CREATE TABLE IF NOT EXISTS usuario (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    email           VARCHAR(150) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    rol             ENUM('ADMIN', 'CLIENTE') NOT NULL,
    cliente_id      INT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                                     ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT uq_usuario_email UNIQUE (email),
    CONSTRAINT fk_usuario_cliente
        FOREIGN KEY (cliente_id) REFERENCES cliente(id) ON DELETE SET NULL
) ENGINE=InnoDB;


GRANT ALL PRIVILEGES ON rentar.* TO 'rentar_user'@'%';
FLUSH PRIVILEGES;

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

