-- =====================================================================
-- SISTEMA DE GESTION DE LIGA DE FUTBOL - SCRIPT DDL Y DML
-- Base de Datos: MySQL (versión 8.0+ o MariaDB 10.4+)
-- Listo para ejecutar en MySQL Workbench o CLI de una sola vez
-- =====================================================================

-- 1. Eliminar base de datos si existe y recrearla limpia
DROP DATABASE IF EXISTS liga_futbol;
CREATE DATABASE liga_futbol CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. Creación de la tabla 'equipos'
CREATE TABLE liga_futbol.equipos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    ciudad VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Creación de la tabla 'encuentros'
CREATE TABLE liga_futbol.encuentros (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    equipo_local_id BIGINT NOT NULL,
    equipo_visitante_id BIGINT NOT NULL,
    goles_local INT NOT NULL DEFAULT 0,
    goles_visitante INT NOT NULL DEFAULT 0,
    fecha DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_encuentro_equipo_local FOREIGN KEY (equipo_local_id) REFERENCES liga_futbol.equipos(id) ON DELETE CASCADE,
    CONSTRAINT fk_encuentro_equipo_visitante FOREIGN KEY (equipo_visitante_id) REFERENCES liga_futbol.equipos(id) ON DELETE CASCADE,
    CONSTRAINT chk_equipos_distintos CHECK (equipo_local_id <> equipo_visitante_id),
    CONSTRAINT chk_goles_local_positivos CHECK (goles_local >= 0),
    CONSTRAINT chk_goles_visitante_positivos CHECK (goles_visitante >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Datos de prueba: Equipos (mínimo 4)
INSERT INTO liga_futbol.equipos (id, nombre, ciudad) VALUES
(1, 'Universitario de Deportes', 'Lima'),
(2, 'Alianza Lima', 'Lima'),
(3, 'Sporting Cristal', 'Lima'),
(4, 'FBC Melgar', 'Arequipa'),
(5, 'Cienciano', 'Cusco'),
(6, 'Universidad César Vallejo', 'Trujillo');

-- 5. Datos de prueba: Encuentros (mínimo 4)
-- Formato de fecha: YYYY-MM-DD
INSERT INTO liga_futbol.encuentros (equipo_local_id, equipo_visitante_id, goles_local, goles_visitante, fecha) VALUES
(1, 2, 2, 1, '2026-09-01'), -- Universitario 2 - 1 Alianza Lima
(3, 4, 3, 0, '2026-09-05'), -- Sporting Cristal 3 - 0 FBC Melgar
(5, 6, 1, 1, '2026-09-10'), -- Cienciano 1 - 1 UCV
(2, 3, 2, 2, '2026-09-15'), -- Alianza Lima 2 - 2 Sporting Cristal
(4, 1, 1, 0, '2026-09-18'), -- FBC Melgar 1 - 0 Universitario
(6, 2, 0, 2, '2026-09-22'); -- UCV 0 - 2 Alianza Lima

-- 6. Verificación de inserciones
SELECT * FROM liga_futbol.equipos;
SELECT
    e.id,
    el.nombre AS local,
    e.goles_local,
    e.goles_visitante,
    ev.nombre AS visitante,
    e.fecha
FROM liga_futbol.encuentros e
INNER JOIN liga_futbol.equipos el ON e.equipo_local_id = el.id
INNER JOIN liga_futbol.equipos ev ON e.equipo_visitante_id = ev.id
ORDER BY e.fecha DESC;
