package com.liga.futbol.controller;

import com.liga.futbol.dto.EncuentroRequestDTO;
import com.liga.futbol.dto.EncuentroResponseDTO;
import com.liga.futbol.dto.TablaPosicionDTO;
import com.liga.futbol.service.EncuentroService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<List<EncuentroResponseDTO>> listarEncuentros() {
        return ResponseEntity.ok(encuentroService.listarEncuentros());
    }

    @GetMapping("/tabla-posiciones")
    public ResponseEntity<List<TablaPosicionDTO>> obtenerTablaPosiciones() {
        return ResponseEntity.ok(encuentroService.obtenerTablaPosiciones());
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
