package com.liga.futbol.service;

import com.liga.futbol.dto.EstadisticaEquipoDTO;
import com.liga.futbol.dto.ResumenTorneoDTO;

public interface StatsService {

    /**
     * Obtiene estadísticas detalladas de un equipo por su ID, incluyendo la racha de los últimos 5 resultados.
     */
    EstadisticaEquipoDTO obtenerEstadisticasEquipo(Long equipoId);

    /**
     * Obtiene el resumen global del torneo (goles totales, promedio, líder de goleo, mejor defensa).
     */
    ResumenTorneoDTO obtenerResumenTorneo();
}
