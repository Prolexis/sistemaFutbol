package com.liga.futbol.service;

import com.liga.futbol.dto.EquipoDTO;

import java.util.List;

public interface EquipoService {
    EquipoDTO crearEquipo(EquipoDTO equipoDTO);
    List<EquipoDTO> listarEquipos();
    EquipoDTO obtenerEquipoPorId(Long id);
    EquipoDTO actualizarEquipo(Long id, EquipoDTO equipoDTO);
    void eliminarEquipo(Long id);
}
