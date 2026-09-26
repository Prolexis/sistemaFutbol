package com.liga.futbol.service;

import com.liga.futbol.dto.EncuentroRequestDTO;
import com.liga.futbol.dto.EncuentroResponseDTO;
import com.liga.futbol.dto.TablaPosicionDTO;

import java.util.List;

public interface EncuentroService {
    EncuentroResponseDTO registrarEncuentro(EncuentroRequestDTO request);
    List<EncuentroResponseDTO> listarEncuentros();
    EncuentroResponseDTO obtenerEncuentroPorId(Long id);
    EncuentroResponseDTO actualizarEncuentro(Long id, EncuentroRequestDTO request);
    void eliminarEncuentro(Long id);
    List<TablaPosicionDTO> obtenerTablaPosiciones();
}
