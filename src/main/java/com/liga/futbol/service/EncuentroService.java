package com.liga.futbol.service;

import com.liga.futbol.dto.EncuentroRequestDTO;
import com.liga.futbol.dto.EncuentroResponseDTO;
import com.liga.futbol.dto.TablaPosicionDTO;

import java.time.LocalDate;
import java.util.List;

public interface EncuentroService {
    EncuentroResponseDTO registrarEncuentro(EncuentroRequestDTO request);
    List<EncuentroResponseDTO> listarEncuentros();
    EncuentroResponseDTO obtenerEncuentroPorId(Long id);
    EncuentroResponseDTO actualizarEncuentro(Long id, EncuentroRequestDTO request);
    void eliminarEncuentro(Long id);
    List<TablaPosicionDTO> obtenerTablaPosiciones();

    /** Nuevo: listar encuentros con filtros opcionales (equipoId, fechaInicio, fechaFin) */
    List<EncuentroResponseDTO> listarEncuentrosFiltrados(Long equipoId, LocalDate fechaInicio, LocalDate fechaFin);

    /** Nuevo: devuelve los últimos 5 encuentros registrados ordenados descendentemente */
    List<EncuentroResponseDTO> obtenerEncuentrosRecientes();
}
