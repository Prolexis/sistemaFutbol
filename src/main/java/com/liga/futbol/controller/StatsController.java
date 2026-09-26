package com.liga.futbol.controller;

import com.liga.futbol.dto.EstadisticaEquipoDTO;
import com.liga.futbol.dto.ResumenTorneoDTO;
import com.liga.futbol.service.StatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class StatsController {

    private final StatsService statsService;

    /**
     * GET /api/equipos/{id}/estadisticas
     * Devuelve PJ, PG, PE, PP, GF, GC, puntos y la racha de los últimos 5 resultados.
     */
    @GetMapping("/equipos/{id}/estadisticas")
    public ResponseEntity<EstadisticaEquipoDTO> obtenerEstadisticasEquipo(@PathVariable Long id) {
        EstadisticaEquipoDTO dto = statsService.obtenerEstadisticasEquipo(id);
        return ResponseEntity.ok(dto);
    }

    /**
     * GET /api/estadisticas/resumen
     * Devuelve el resumen global del torneo (goles totales, promedio, líder de goleo, mejor defensa).
     */
    @GetMapping("/estadisticas/resumen")
    public ResponseEntity<ResumenTorneoDTO> obtenerResumenTorneo() {
        ResumenTorneoDTO dto = statsService.obtenerResumenTorneo();
        return ResponseEntity.ok(dto);
    }
}
