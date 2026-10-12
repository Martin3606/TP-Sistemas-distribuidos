-- =========================================================
-- Rentar - Modelo de datos (Hito 2: Microservicios)
-- =========================================================

-- =========================================================
-- 1. BASE DE DATOS: CLIENTES (Customer Service)
-- =========================================================
CREATE DATABASE IF NOT EXISTS db_clientes
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE db_clientes;

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
    updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_cliente_documento UNIQUE (documento),
    CONSTRAINT uq_cliente_email     UNIQUE (email)
) ENGINE=InnoDB;

-- Agregamos la tabla usuario para el login (relacionada físicamente a cliente porque viven en la misma BD)
CREATE TABLE IF NOT EXISTS usuario (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol           VARCHAR(50) NOT NULL,
    cliente_id    INT,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuario_cliente FOREIGN KEY (cliente_id) REFERENCES cliente(id)
) ENGINE=InnoDB;


-- =========================================================
-- 2. BASE DE DATOS: VEHÍCULOS (Vehicle Service)
-- =========================================================
CREATE DATABASE IF NOT EXISTS db_vehiculos
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE db_vehiculos;

CREATE TABLE IF NOT EXISTS vehiculo (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    patente         VARCHAR(10)  NOT NULL,
    marca           VARCHAR(60)  NOT NULL,
    modelo          VARCHAR(60)  NOT NULL,
    anio            SMALLINT     NOT NULL,
    color           VARCHAR(30),
    tipo_vehiculo   ENUM('SEDAN','SUV','PICKUP','COUPE','HATCHBACK') NOT NULL,
    precio_diario   DECIMAL(10,2) NOT NULL,
    estado          ENUM('DISPONIBLE','RESERVADO','EN_ALQUILER') NOT NULL DEFAULT 'DISPONIBLE',
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_vehiculo_patente UNIQUE (patente),
    CONSTRAINT chk_vehiculo_precio CHECK (precio_diario > 0),
    CONSTRAINT chk_vehiculo_anio   CHECK (anio >= 1990)
) ENGINE=InnoDB;


-- =========================================================
-- 3. BASE DE DATOS: ALQUILERES (Rental Service)
-- =========================================================
CREATE DATABASE IF NOT EXISTS db_alquileres
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE db_alquileres;

CREATE TABLE IF NOT EXISTS reserva (
    id                      INT AUTO_INCREMENT PRIMARY KEY,
    -- Claves lógicas (sin CONSTRAINT FOREIGN KEY)
    cliente_id              INT NOT NULL,
    vehiculo_id             INT NOT NULL,
    fecha_inicio            DATETIME NOT NULL,
    fecha_fin               DATETIME NOT NULL,
    precio_diario_snapshot  DECIMAL(10,2) NOT NULL,
    importe_total           DECIMAL(10,2) NOT NULL,
    estado                  ENUM('CONFIRMADA','CANCELADA','FINALIZADA') NOT NULL DEFAULT 'CONFIRMADA',
    created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_reserva_fechas CHECK (fecha_fin > fecha_inicio)
) ENGINE=InnoDB;

-- Índices de rendimiento (se mantienen intactos)
CREATE INDEX idx_reserva_disponibilidad ON reserva (vehiculo_id, estado, fecha_inicio, fecha_fin);
CREATE INDEX idx_reserva_cliente ON reserva (cliente_id, estado);