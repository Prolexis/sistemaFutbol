-- =====================================================================
-- SISTEMA DE GESTION DE LIGA DE FUTBOL - SCRIPT DDL Y DML
-- Base de Datos: MySQL (versión 8.0+ o MariaDB 10.4+)
-- Listo para ejecutar en MySQL Workbench o CLI de una sola vez
-- =====================================================================

-- 1. Eliminar base de datos si existe y recrearla limpia
DROP DATABASE IF EXISTS bd_encuentrosdeportivos;
CREATE DATABASE bd_encuentrosdeportivos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Creación de la tabla 'equipos'
CREATE TABLE bd_encuentrosdeportivos.equipos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    ciudad VARCHAR(100) NOT NULL,
    estadio VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Creación de la tabla 'encuentros'
CREATE TABLE bd_encuentrosdeportivos.encuentros (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    equipo_local_id BIGINT NOT NULL,
    equipo_visitante_id BIGINT NOT NULL,
    goles_local INT NOT NULL DEFAULT 0,
    goles_visitante INT NOT NULL DEFAULT 0,
    fecha DATE NOT NULL,
    hora VARCHAR(10),
    jornada INT,
    estadio VARCHAR(150),
    arbitro VARCHAR(100),
    estado VARCHAR(30),
    tarjetas_amarillas_local INT DEFAULT 0,
    tarjetas_amarillas_visitante INT DEFAULT 0,
    tarjetas_rojas_local INT DEFAULT 0,
    tarjetas_rojas_visitante INT DEFAULT 0,
    tiros_local INT DEFAULT 0,
    tiros_visitante INT DEFAULT 0,
    posesion_local INT DEFAULT 50,
    posesion_visitante INT DEFAULT 50,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_encuentro_equipo_local FOREIGN KEY (equipo_local_id) REFERENCES bd_encuentrosdeportivos.equipos(id) ON DELETE CASCADE,
    CONSTRAINT fk_encuentro_equipo_visitante FOREIGN KEY (equipo_visitante_id) REFERENCES bd_encuentrosdeportivos.equipos(id) ON DELETE CASCADE,
    CONSTRAINT chk_equipos_distintos CHECK (equipo_local_id <> equipo_visitante_id),
    CONSTRAINT chk_goles_local_positivos CHECK (goles_local >= 0),
    CONSTRAINT chk_goles_visitante_positivos CHECK (goles_visitante >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Datos de prueba: Equipos
INSERT INTO bd_encuentrosdeportivos.equipos (id, nombre, ciudad, estadio) VALUES
(1, 'Universitario de Deportes', 'Lima', 'Estadio Monumental U'),
(2, 'Alianza Lima', 'Lima', 'Estadio Alejandro Villanueva'),
(3, 'Sporting Cristal', 'Lima', 'Estadio Alberto Gallardo'),
(4, 'FBC Melgar', 'Arequipa', 'Estadio Monumental de la UNSA'),
(5, 'Cienciano', 'Cusco', 'Estadio Garcilaso de la Vega'),
(6, 'Universidad César Vallejo', 'Trujillo', 'Estadio Mansiche');

-- 5. Datos de prueba: Encuentros
INSERT INTO bd_encuentrosdeportivos.encuentros (equipo_local_id, equipo_visitante_id, goles_local, goles_visitante, fecha, estadio, arbitro) VALUES
(1, 2, 2, 1, '2026-09-01', 'Estadio Monumental U', 'Diego Haro'),
(3, 4, 3, 0, '2026-09-05', 'Estadio Alberto Gallardo', 'Kevin Ortega'),
(5, 6, 1, 1, '2026-09-10', 'Estadio Garcilaso de la Vega', 'Víctor Hugo Carrillo'),
(2, 3, 2, 2, '2026-09-15', 'Estadio Alejandro Villanueva', 'Bruno Pérez'),
(4, 1, 1, 0, '2026-09-18', 'Estadio Monumental de la UNSA', 'Michael Espinoza'),
(6, 2, 0, 2, '2026-09-22', 'Estadio Mansiche', 'Diego Haro');

-- 6. Verificación de inserciones
SELECT * FROM bd_encuentrosdeportivos.equipos;
SELECT * FROM bd_encuentrosdeportivos.encuentros;
