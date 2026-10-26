-- =========================================================
-- Rentar - Modelo de datos (Hitos 2 y 3: Microservicios y eventos)
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
    resultado_verificacion ENUM('PENDIENTE','VALIDADO','ROBADO') NOT NULL DEFAULT 'PENDIENTE',
    inhabilitado_por_robo BOOLEAN NOT NULL DEFAULT FALSE,
    origen          ENUM('PROPIO','EXTERNO') NOT NULL DEFAULT 'PROPIO',
    cliente_propietario_id INT NULL,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_vehiculo_patente UNIQUE (patente),
    CONSTRAINT chk_vehiculo_precio CHECK (precio_diario > 0),
    CONSTRAINT chk_vehiculo_anio   CHECK (anio >= 1990)
) ENGINE=InnoDB;

CREATE INDEX idx_vehiculo_propietario ON vehiculo (cliente_propietario_id, origen);

-- Registro simulado de vehículos denunciados como robados.
CREATE TABLE IF NOT EXISTS registro_robos (
    patente       VARCHAR(10) PRIMARY KEY,
    denunciado_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observacion   VARCHAR(255)
) ENGINE=InnoDB;

-- Registro simulado de titularidad externa (patente -> documento).
CREATE TABLE IF NOT EXISTS registro_titularidad (
    patente   VARCHAR(10) PRIMARY KEY,
    documento VARCHAR(20) NOT NULL,
    titular   VARCHAR(150),
    INDEX idx_registro_titularidad_documento (documento)
) ENGINE=InnoDB;

-- Solicitudes de incorporación de automóviles de clientes.
CREATE TABLE IF NOT EXISTS vehiculo_externo_solicitud (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id      INT NOT NULL,
    documento       VARCHAR(20) NOT NULL,
    patente         VARCHAR(10) NOT NULL,
    marca           VARCHAR(60) NOT NULL,
    modelo          VARCHAR(60) NOT NULL,
    anio            SMALLINT NOT NULL,
    color           VARCHAR(30),
    tipo_vehiculo   ENUM('SEDAN','SUV','PICKUP','COUPE','HATCHBACK') NOT NULL,
    precio_diario   DECIMAL(10,2) NOT NULL,
    estado          ENUM('PENDIENTE','RECHAZADO','INCORPORADO') NOT NULL DEFAULT 'PENDIENTE',
    vehiculo_id     INT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_vehiculo_externo_patente UNIQUE (patente),
    CONSTRAINT uq_vehiculo_externo_vehiculo UNIQUE (vehiculo_id),
    CONSTRAINT fk_vehiculo_externo_vehiculo FOREIGN KEY (vehiculo_id) REFERENCES vehiculo(id),
    CONSTRAINT chk_vehiculo_externo_precio CHECK (precio_diario > 0),
    CONSTRAINT chk_vehiculo_externo_anio CHECK (anio >= 1990),
    INDEX idx_vehiculo_externo_cliente_estado (cliente_id, estado)
) ENGINE=InnoDB;

-- Una fila por tipo de validación, vinculada a la solicitud para correlacionar resultados.
CREATE TABLE IF NOT EXISTS vehiculo_externo_validacion (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    vehiculo_externo_id   INT NOT NULL,
    tipo_validacion       ENUM('PATENTE','TITULARIDAD') NOT NULL,
    resultado             ENUM('PENDIENTE','VALIDADO','RECHAZADO') NOT NULL DEFAULT 'PENDIENTE',
    updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_externo_validacion_tipo UNIQUE (vehiculo_externo_id, tipo_validacion),
    CONSTRAINT fk_externo_validacion_solicitud FOREIGN KEY (vehiculo_externo_id)
        REFERENCES vehiculo_externo_solicitud(id) ON DELETE CASCADE
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
    resultado_mantenimiento ENUM('PENDIENTE','REALIZADO','NO_REALIZADO') NOT NULL DEFAULT 'PENDIENTE',
    created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_reserva_fechas CHECK (fecha_fin > fecha_inicio)
) ENGINE=InnoDB;

-- Índices de rendimiento (se mantienen intactos)
CREATE INDEX idx_reserva_disponibilidad ON reserva (vehiculo_id, estado, fecha_inicio, fecha_fin);
CREATE INDEX idx_reserva_cliente ON reserva (cliente_id, estado);

-- =========================================================
-- 4. BASE DE DATOS: MANTENIMIENTO (Maintenance Service)
-- =========================================================
CREATE DATABASE IF NOT EXISTS db_mantenimiento
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE db_mantenimiento;

CREATE TABLE IF NOT EXISTS solicitud_mantenimiento (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    reserva_id  INT NOT NULL,
    vehiculo_id INT NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin   DATETIME NOT NULL,
    resultado   ENUM('PENDIENTE','REALIZADO','NO_REALIZADO') NOT NULL DEFAULT 'PENDIENTE',
    solicitado_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    procesado_at DATETIME NULL,
    CONSTRAINT uq_mantenimiento_reserva UNIQUE (reserva_id),
    CONSTRAINT chk_mantenimiento_fechas CHECK (fecha_fin > fecha_inicio),
    INDEX idx_mantenimiento_resultado (resultado, solicitado_at)
) ENGINE=InnoDB;
