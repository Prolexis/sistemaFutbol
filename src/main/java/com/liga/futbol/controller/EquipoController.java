package com.liga.futbol.controller;

import com.liga.futbol.dto.EquipoDTO;
import com.liga.futbol.service.EquipoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/equipos")
@RequiredArgsConstructor
public class EquipoController {

    private final EquipoService equipoService;

    @PostMapping
    public ResponseEntity<EquipoDTO> crearEquipo(@Valid @RequestBody EquipoDTO equipoDTO) {
        EquipoDTO nuevoEquipo = equipoService.crearEquipo(equipoDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(nuevoEquipo);
    }

    @GetMapping
    public ResponseEntity<List<EquipoDTO>> listarEquipos() {
        return ResponseEntity.ok(equipoService.listarEquipos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EquipoDTO> obtenerEquipoPorId(@PathVariable Long id) {
        return ResponseEntity.ok(equipoService.obtenerEquipoPorId(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EquipoDTO> actualizarEquipo(@PathVariable Long id, @Valid @RequestBody EquipoDTO equipoDTO) {
        return ResponseEntity.ok(equipoService.actualizarEquipo(id, equipoDTO));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminarEquipo(@PathVariable Long id) {
        equipoService.eliminarEquipo(id);
        return ResponseEntity.noContent().build();
    }
}
