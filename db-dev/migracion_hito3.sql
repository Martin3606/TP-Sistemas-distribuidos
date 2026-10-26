-- Migracion aditiva para instalaciones Hito 2 que ya tienen el volumen de MySQL creado.
-- Es segura para volver a ejecutarse y conserva los datos existentes.
-- Uso desde la raiz del repositorio:
-- docker exec -i rentar-mysql mysql -uroot -proot < db-dev/migracion_hito3.sql

CREATE DATABASE IF NOT EXISTS db_vehiculos
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
USE db_vehiculos;

DROP PROCEDURE IF EXISTS agregar_columna_si_falta;
DELIMITER $$
CREATE PROCEDURE agregar_columna_si_falta(
    IN p_esquema VARCHAR(64),
    IN p_tabla VARCHAR(64),
    IN p_columna VARCHAR(64),
    IN p_definicion VARCHAR(500)
)
BEGIN
    DECLARE existe INT DEFAULT 0;
    SELECT COUNT(*) INTO existe
      FROM information_schema.columns
     WHERE table_schema = p_esquema
       AND table_name = p_tabla
       AND column_name = p_columna;
    IF existe = 0 THEN
        SET @ddl = CONCAT('ALTER TABLE `', p_esquema, '`.`', p_tabla,
                          '` ADD COLUMN `', p_columna, '` ', p_definicion);
        PREPARE instruccion FROM @ddl;
        EXECUTE instruccion;
        DEALLOCATE PREPARE instruccion;
    END IF;
END$$
DELIMITER ;

CALL agregar_columna_si_falta('db_vehiculos', 'vehiculo', 'resultado_verificacion',
    'ENUM(''PENDIENTE'',''VALIDADO'',''ROBADO'') NOT NULL DEFAULT ''PENDIENTE''');
CALL agregar_columna_si_falta('db_vehiculos', 'vehiculo', 'inhabilitado_por_robo',
    'BOOLEAN NOT NULL DEFAULT FALSE');
CALL agregar_columna_si_falta('db_vehiculos', 'vehiculo', 'origen',
    'ENUM(''PROPIO'',''EXTERNO'') NOT NULL DEFAULT ''PROPIO''');
CALL agregar_columna_si_falta('db_vehiculos', 'vehiculo', 'cliente_propietario_id',
    'INT NULL');
CALL agregar_columna_si_falta('db_alquileres', 'reserva', 'resultado_mantenimiento',
    'ENUM(''PENDIENTE'',''REALIZADO'',''NO_REALIZADO'') NOT NULL DEFAULT ''PENDIENTE''');

DROP PROCEDURE agregar_columna_si_falta;

SET @indice_existe = (
    SELECT COUNT(*) FROM information_schema.statistics
     WHERE table_schema = 'db_vehiculos'
       AND table_name = 'vehiculo'
       AND index_name = 'idx_vehiculo_propietario'
);
SET @ddl_indice = IF(
    @indice_existe = 0,
    'CREATE INDEX idx_vehiculo_propietario ON db_vehiculos.vehiculo (cliente_propietario_id, origen)',
    'SELECT 1'
);
PREPARE instruccion_indice FROM @ddl_indice;
EXECUTE instruccion_indice;
DEALLOCATE PREPARE instruccion_indice;

USE db_vehiculos;
CREATE TABLE IF NOT EXISTS registro_robos (
    patente       VARCHAR(10) PRIMARY KEY,
    denunciado_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observacion   VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS registro_titularidad (
    patente   VARCHAR(10) PRIMARY KEY,
    documento VARCHAR(20) NOT NULL,
    titular   VARCHAR(150),
    INDEX idx_registro_titularidad_documento (documento)
) ENGINE=InnoDB;

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

CREATE DATABASE IF NOT EXISTS db_mantenimiento
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
USE db_mantenimiento;

CREATE TABLE IF NOT EXISTS solicitud_mantenimiento (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    reserva_id   INT NOT NULL,
    vehiculo_id  INT NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin    DATETIME NOT NULL,
    resultado    ENUM('PENDIENTE','REALIZADO','NO_REALIZADO') NOT NULL DEFAULT 'PENDIENTE',
    solicitado_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    procesado_at DATETIME NULL,
    CONSTRAINT uq_mantenimiento_reserva UNIQUE (reserva_id),
    CONSTRAINT chk_mantenimiento_fechas CHECK (fecha_fin > fecha_inicio),
    INDEX idx_mantenimiento_resultado (resultado, solicitado_at)
) ENGINE=InnoDB;
