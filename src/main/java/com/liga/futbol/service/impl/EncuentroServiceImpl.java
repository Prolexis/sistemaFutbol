package com.liga.futbol.service.impl;

import com.liga.futbol.dto.EncuentroRequestDTO;
import com.liga.futbol.dto.EncuentroResponseDTO;
import com.liga.futbol.dto.EquipoDTO;
import com.liga.futbol.dto.TablaPosicionDTO;
import com.liga.futbol.entity.Encuentro;
import com.liga.futbol.entity.Equipo;
import com.liga.futbol.exception.BusinessRuleException;
import com.liga.futbol.exception.ResourceNotFoundException;
import com.liga.futbol.repository.EncuentroRepository;
import com.liga.futbol.repository.EquipoRepository;
import com.liga.futbol.service.EncuentroService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class EncuentroServiceImpl implements EncuentroService {

    private final EncuentroRepository encuentroRepository;
    private final EquipoRepository equipoRepository;

    @Override
    public EncuentroResponseDTO registrarEncuentro(EncuentroRequestDTO request) {
        validarReglasEncuentro(request);

        Equipo local = equipoRepository.findById(request.getEquipoLocalId())
                .orElseThrow(() -> new ResourceNotFoundException("El equipo local con ID " + request.getEquipoLocalId() + " no existe."));

        Equipo visitante = equipoRepository.findById(request.getEquipoVisitanteId())
                .orElseThrow(() -> new ResourceNotFoundException("El equipo visitante con ID " + request.getEquipoVisitanteId() + " no existe."));

        Encuentro encuentro = Encuentro.builder()
                .equipoLocal(local)
                .equipoVisitante(visitante)
                .golesLocal(request.getGolesLocal())
                .golesVisitante(request.getGolesVisitante())
                .fecha(request.getFecha())
                .build();

        Encuentro guardado = encuentroRepository.save(encuentro);
        return mapToResponseDTO(guardado);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EncuentroResponseDTO> listarEncuentros() {
        return encuentroRepository.findAllByOrderByFechaDescIdDesc().stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public EncuentroResponseDTO obtenerEncuentroPorId(Long id) {
        Encuentro encuentro = encuentroRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No se encontró el encuentro con ID: " + id));
        return mapToResponseDTO(encuentro);
    }

    @Override
    public EncuentroResponseDTO actualizarEncuentro(Long id, EncuentroRequestDTO request) {
        Encuentro encuentro = encuentroRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No se encontró el encuentro con ID: " + id));

        validarReglasEncuentro(request);

        Equipo local = equipoRepository.findById(request.getEquipoLocalId())
                .orElseThrow(() -> new ResourceNotFoundException("El equipo local con ID " + request.getEquipoLocalId() + " no existe."));

        Equipo visitante = equipoRepository.findById(request.getEquipoVisitanteId())
                .orElseThrow(() -> new ResourceNotFoundException("El equipo visitante con ID " + request.getEquipoVisitanteId() + " no existe."));

        encuentro.setEquipoLocal(local);
        encuentro.setEquipoVisitante(visitante);
        encuentro.setGolesLocal(request.getGolesLocal());
        encuentro.setGolesVisitante(request.getGolesVisitante());
        encuentro.setFecha(request.getFecha());

        Encuentro actualizado = encuentroRepository.save(encuentro);
        return mapToResponseDTO(actualizado);
    }

    @Override
    public void eliminarEncuentro(Long id) {
        if (!encuentroRepository.existsById(id)) {
            throw new ResourceNotFoundException("No se encontró el encuentro con ID: " + id);
        }
        encuentroRepository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TablaPosicionDTO> obtenerTablaPosiciones() {
        List<Equipo> todosEquipos = equipoRepository.findAll();
        List<Encuentro> todosEncuentros = encuentroRepository.findAll();

        Map<Long, TablaPosicionDTO> tablaMap = new HashMap<>();

        // 1. Inicializar todos los equipos en 0 para que incluso los que no han jugado aparezcan
        for (Equipo eq : todosEquipos) {
            TablaPosicionDTO fila = TablaPosicionDTO.builder()
                    .equipoId(eq.getId())
                    .equipoNombre(eq.getNombre())
                    .ciudad(eq.getCiudad())
                    .partidosJugados(0)
                    .partidosGanados(0)
                    .partidosEmpatados(0)
                    .partidosPerdidos(0)
                    .golesAFavor(0)
                    .golesEnContra(0)
                    .diferenciaGoles(0)
                    .puntos(0)
                    .build();
            tablaMap.put(eq.getId(), fila);
        }

        // 2. Procesar cada encuentro
        for (Encuentro match : todosEncuentros) {
            Long idLocal = match.getEquipoLocal().getId();
            Long idVisitante = match.getEquipoVisitante().getId();

            TablaPosicionDTO local = tablaMap.get(idLocal);
            TablaPosicionDTO visitante = tablaMap.get(idVisitante);

            if (local == null || visitante == null) {
                continue; // Por consistencia si algún equipo fue modificado
            }

            int gl = match.getGolesLocal();
            int gv = match.getGolesVisitante();

            // Partidos Jugados
            local.setPartidosJugados(local.getPartidosJugados() + 1);
            visitante.setPartidosJugados(visitante.getPartidosJugados() + 1);

            // Goles a favor y en contra
            local.setGolesAFavor(local.getGolesAFavor() + gl);
            local.setGolesEnContra(local.getGolesEnContra() + gv);

            visitante.setGolesAFavor(visitante.getGolesAFavor() + gv);
            visitante.setGolesEnContra(visitante.getGolesEnContra() + gl);

            // Puntuación: Victoria = 3, Empate = 1, Derrota = 0
            if (gl > gv) {
                local.setPartidosGanados(local.getPartidosGanados() + 1);
                local.setPuntos(local.getPuntos() + 3);

                visitante.setPartidosPerdidos(visitante.getPartidosPerdidos() + 1);
            } else if (gl < gv) {
                visitante.setPartidosGanados(visitante.getPartidosGanados() + 1);
                visitante.setPuntos(visitante.getPuntos() + 3);

                local.setPartidosPerdidos(local.getPartidosPerdidos() + 1);
            } else {
                local.setPartidosEmpatados(local.getPartidosEmpatados() + 1);
                local.setPuntos(local.getPuntos() + 1);

                visitante.setPartidosEmpatados(visitante.getPartidosEmpatados() + 1);
                visitante.setPuntos(visitante.getPuntos() + 1);
            }
        }

        // 3. Calcular Diferencia de Goles para cada equipo
        for (TablaPosicionDTO fila : tablaMap.values()) {
            fila.setDiferenciaGoles(fila.getGolesAFavor() - fila.getGolesEnContra());
        }

        // 4. Ordenar: 1° Puntos, 2° Diferencia de gol, 3° Goles a favor, 4° Alfabético
        List<TablaPosicionDTO> clasificacion = new ArrayList<>(tablaMap.values());
        clasificacion.sort(
                Comparator.comparing(TablaPosicionDTO::getPuntos, Comparator.reverseOrder())
                        .thenComparing(TablaPosicionDTO::getDiferenciaGoles, Comparator.reverseOrder())
                        .thenComparing(TablaPosicionDTO::getGolesAFavor, Comparator.reverseOrder())
                        .thenComparing(TablaPosicionDTO::getEquipoNombre, String.CASE_INSENSITIVE_ORDER)
        );

        // 5. Asignar posiciones ordinales (1, 2, 3...)
        for (int i = 0; i < clasificacion.size(); i++) {
            clasificacion.get(i).setPosicion(i + 1);
        }

        return clasificacion;
    }

    private void validarReglasEncuentro(EncuentroRequestDTO request) {
        if (request.getEquipoLocalId() == null || request.getEquipoVisitanteId() == null) {
            throw new BusinessRuleException("Debe seleccionar tanto el equipo local como el equipo visitante.");
        }

        if (request.getEquipoLocalId().equals(request.getEquipoVisitanteId())) {
            throw new BusinessRuleException("Un equipo no puede enfrentarse a sí mismo.");
        }

        if (request.getGolesLocal() == null || request.getGolesLocal() < 0) {
            throw new BusinessRuleException("Los goles del equipo local deben ser mayores o iguales a 0.");
        }

        if (request.getGolesVisitante() == null || request.getGolesVisitante() < 0) {
            throw new BusinessRuleException("Los goles del equipo visitante deben ser mayores o iguales a 0.");
        }

        if (request.getFecha() == null) {
            throw new BusinessRuleException("La fecha del encuentro es obligatoria.");
        }
    }

    private EncuentroResponseDTO mapToResponseDTO(Encuentro e) {
        return EncuentroResponseDTO.builder()
                .id(e.getId())
                .equipoLocal(EquipoDTO.builder()
                        .id(e.getEquipoLocal().getId())
                        .nombre(e.getEquipoLocal().getNombre())
                        .ciudad(e.getEquipoLocal().getCiudad())
                        .build())
                .equipoVisitante(EquipoDTO.builder()
                        .id(e.getEquipoVisitante().getId())
                        .nombre(e.getEquipoVisitante().getNombre())
                        .ciudad(e.getEquipoVisitante().getCiudad())
                        .build())
                .golesLocal(e.getGolesLocal())
                .golesVisitante(e.getGolesVisitante())
                .fecha(e.getFecha())
                .build();
    }
}
