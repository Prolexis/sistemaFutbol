package com.liga.futbol.controller;

import com.liga.futbol.dto.EncuentroRequestDTO;
import com.liga.futbol.dto.EncuentroResponseDTO;
import com.liga.futbol.dto.TablaPosicionDTO;
import com.liga.futbol.service.EncuentroService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/encuentros")
@RequiredArgsConstructor
public class EncuentroController {

    private final EncuentroService encuentroService;

    @PostMapping
    public ResponseEntity<EncuentroResponseDTO> registrarEncuentro(@Valid @RequestBody EncuentroRequestDTO request) {
        EncuentroResponseDTO nuevoEncuentro = encuentroService.registrarEncuentro(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(nuevoEncuentro);
    }

    @GetMapping
    public ResponseEntity<List<EncuentroResponseDTO>> listarEncuentros(
            @RequestParam(required = false) Long equipoId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin) {

        // Si no se envía ningún filtro, comportamiento idéntico al original
        boolean sinFiltros = equipoId == null && fechaInicio == null && fechaFin == null;
        if (sinFiltros) {
            return ResponseEntity.ok(encuentroService.listarEncuentros());
        }
        return ResponseEntity.ok(encuentroService.listarEncuentrosFiltrados(equipoId, fechaInicio, fechaFin));
    }

    @GetMapping("/tabla-posiciones")
    public ResponseEntity<List<TablaPosicionDTO>> obtenerTablaPosiciones() {
        return ResponseEntity.ok(encuentroService.obtenerTablaPosiciones());
    }

    /**
     * GET /api/encuentros/recientes
     * Devuelve los últimos 5 encuentros registrados, ordenados descendentemente.
     */
    @GetMapping("/recientes")
    public ResponseEntity<List<EncuentroResponseDTO>> obtenerEncuentrosRecientes() {
        return ResponseEntity.ok(encuentroService.obtenerEncuentrosRecientes());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EncuentroResponseDTO> obtenerEncuentroPorId(@PathVariable Long id) {
        return ResponseEntity.ok(encuentroService.obtenerEncuentroPorId(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EncuentroResponseDTO> actualizarEncuentro(@PathVariable Long id, @Valid @RequestBody EncuentroRequestDTO request) {
        return ResponseEntity.ok(encuentroService.actualizarEncuentro(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarEncuentro(@PathVariable Long id) {
        encuentroService.eliminarEncuentro(id);
        return ResponseEntity.noContent().build();
    }
}
