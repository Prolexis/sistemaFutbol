package com.liga.futbol.service.impl;

import com.liga.futbol.dto.EncuentroRequestDTO;
import com.liga.futbol.dto.EncuentroResponseDTO;
import com.liga.futbol.dto.EquipoDTO;
import com.liga.futbol.dto.TablaPosicionDTO;
import com.liga.futbol.entity.Encuentro;
import com.liga.futbol.entity.Equipo;
import com.liga.futbol.exception.RecursoNoEncontradoException;
import com.liga.futbol.exception.ReglaDeNegocioException;
import com.liga.futbol.repository.EncuentroRepository;
import com.liga.futbol.repository.EquipoRepository;
import com.liga.futbol.service.EncuentroService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.time.LocalDate;
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
                .orElseThrow(() -> new RecursoNoEncontradoException("El equipo local con ID " + request.getEquipoLocalId() + " no existe."));

        Equipo visitante = equipoRepository.findById(request.getEquipoVisitanteId())
                .orElseThrow(() -> new RecursoNoEncontradoException("El equipo visitante con ID " + request.getEquipoVisitanteId() + " no existe."));

        Encuentro encuentro = Encuentro.builder()
                .equipoLocal(local)
                .equipoVisitante(visitante)
                .golesLocal(request.getGolesLocal())
                .golesVisitante(request.getGolesVisitante())
                .fecha(request.getFecha())
                .hora(request.getHora() != null && !request.getHora().isBlank() ? request.getHora().trim() : "15:30")
                .jornada(request.getJornada() != null ? request.getJornada() : 1)
                .estadio(request.getEstadio() != null && !request.getEstadio().isBlank() ? request.getEstadio().trim() : "Estadio " + local.getNombre())
                .arbitro(request.getArbitro() != null && !request.getArbitro().isBlank() ? request.getArbitro().trim() : "Árbitro Oficial")
                .estado(request.getEstado() != null && !request.getEstado().isBlank() ? request.getEstado() : "FINALIZADO")
                .tarjetasAmarillasLocal(request.getTarjetasAmarillasLocal() != null ? request.getTarjetasAmarillasLocal() : 0)
                .tarjetasAmarillasVisitante(request.getTarjetasAmarillasVisitante() != null ? request.getTarjetasAmarillasVisitante() : 0)
                .tarjetasRojasLocal(request.getTarjetasRojasLocal() != null ? request.getTarjetasRojasLocal() : 0)
                .tarjetasRojasVisitante(request.getTarjetasRojasVisitante() != null ? request.getTarjetasRojasVisitante() : 0)
                .tirosLocal(request.getTirosLocal() != null ? request.getTirosLocal() : 0)
                .tirosVisitante(request.getTirosVisitante() != null ? request.getTirosVisitante() : 0)
                .posesionLocal(request.getPosesionLocal() != null ? request.getPosesionLocal() : 50)
                .posesionVisitante(request.getPosesionVisitante() != null ? request.getPosesionVisitante() : 50)
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
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el encuentro con ID: " + id));
        return mapToResponseDTO(encuentro);
    }

    @Override
    public EncuentroResponseDTO actualizarEncuentro(Long id, EncuentroRequestDTO request) {
        Encuentro encuentro = encuentroRepository.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el encuentro con ID: " + id));

        validarReglasEncuentro(request);

        Equipo local = equipoRepository.findById(request.getEquipoLocalId())
                .orElseThrow(() -> new RecursoNoEncontradoException("El equipo local con ID " + request.getEquipoLocalId() + " no existe."));

        Equipo visitante = equipoRepository.findById(request.getEquipoVisitanteId())
                .orElseThrow(() -> new RecursoNoEncontradoException("El equipo visitante con ID " + request.getEquipoVisitanteId() + " no existe."));

        encuentro.setEquipoLocal(local);
        encuentro.setEquipoVisitante(visitante);
        encuentro.setGolesLocal(request.getGolesLocal());
        encuentro.setGolesVisitante(request.getGolesVisitante());
        encuentro.setFecha(request.getFecha());
        encuentro.setHora(request.getHora() != null && !request.getHora().isBlank() ? request.getHora().trim() : "15:30");
        encuentro.setJornada(request.getJornada() != null ? request.getJornada() : 1);
        encuentro.setEstadio(request.getEstadio() != null && !request.getEstadio().isBlank() ? request.getEstadio().trim() : "Estadio " + local.getNombre());
        encuentro.setArbitro(request.getArbitro() != null && !request.getArbitro().isBlank() ? request.getArbitro().trim() : "Árbitro Oficial");
        encuentro.setEstado(request.getEstado() != null && !request.getEstado().isBlank() ? request.getEstado() : "FINALIZADO");
        encuentro.setTarjetasAmarillasLocal(request.getTarjetasAmarillasLocal() != null ? request.getTarjetasAmarillasLocal() : 0);
        encuentro.setTarjetasAmarillasVisitante(request.getTarjetasAmarillasVisitante() != null ? request.getTarjetasAmarillasVisitante() : 0);
        encuentro.setTarjetasRojasLocal(request.getTarjetasRojasLocal() != null ? request.getTarjetasRojasLocal() : 0);
        encuentro.setTarjetasRojasVisitante(request.getTarjetasRojasVisitante() != null ? request.getTarjetasRojasVisitante() : 0);
        encuentro.setTirosLocal(request.getTirosLocal() != null ? request.getTirosLocal() : 0);
        encuentro.setTirosVisitante(request.getTirosVisitante() != null ? request.getTirosVisitante() : 0);
        encuentro.setPosesionLocal(request.getPosesionLocal() != null ? request.getPosesionLocal() : 50);
        encuentro.setPosesionVisitante(request.getPosesionVisitante() != null ? request.getPosesionVisitante() : 50);

        Encuentro actualizado = encuentroRepository.save(encuentro);
        return mapToResponseDTO(actualizado);
    }

    @Override
    public void eliminarEncuentro(Long id) {
        if (!encuentroRepository.existsById(id)) {
            throw new RecursoNoEncontradoException("No se encontró el encuentro con ID: " + id);
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

        // 2. Procesar cada encuentro (solo partidos finalizados computan puntos y goles para la tabla)
        for (Encuentro match : todosEncuentros) {
            if (match.getEstado() != null && (match.getEstado().equalsIgnoreCase("PROGRAMADO") || match.getEstado().equalsIgnoreCase("SUSPENDIDO"))) {
                continue;
            }

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

    @Override
    @Transactional(readOnly = true)
    public List<EncuentroResponseDTO> listarEncuentrosFiltrados(Long equipoId, LocalDate fechaInicio, LocalDate fechaFin) {
        List<Encuentro> encuentros;

        boolean tieneEquipo = equipoId != null;
        boolean tieneFechas = fechaInicio != null && fechaFin != null;

        if (tieneEquipo && tieneFechas) {
            encuentros = encuentroRepository.findByEquipoIdAndFechaBetween(equipoId, fechaInicio, fechaFin);
        } else if (tieneEquipo) {
            encuentros = encuentroRepository.findByEquipoLocalIdOrEquipoVisitanteIdOrderByFechaDescIdDesc(equipoId, equipoId);
        } else if (tieneFechas) {
            encuentros = encuentroRepository.findByFechaBetweenOrderByFechaDescIdDesc(fechaInicio, fechaFin);
        } else {
            encuentros = encuentroRepository.findAllByOrderByFechaDescIdDesc();
        }

        return encuentros.stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<EncuentroResponseDTO> obtenerEncuentrosRecientes() {
        return encuentroRepository.findTop5ByOrderByIdDesc().stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    private void validarReglasEncuentro(EncuentroRequestDTO request) {
        if (request.getEquipoLocalId() == null || request.getEquipoVisitanteId() == null) {
            throw new ReglaDeNegocioException("Debe seleccionar tanto el equipo local como el equipo visitante.");
        }

        if (request.getEquipoLocalId().equals(request.getEquipoVisitanteId())) {
            throw new ReglaDeNegocioException("Un equipo no puede enfrentarse a sí mismo.");
        }

        if (request.getGolesLocal() == null || request.getGolesLocal() < 0) {
            throw new ReglaDeNegocioException("Los goles del equipo local deben ser mayores o iguales a 0.");
        }

        if (request.getGolesVisitante() == null || request.getGolesVisitante() < 0) {
            throw new ReglaDeNegocioException("Los goles del equipo visitante deben ser mayores o iguales a 0.");
        }

        if (request.getFecha() == null) {
            throw new ReglaDeNegocioException("La fecha del encuentro es obligatoria.");
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
                .hora(e.getHora() != null ? e.getHora() : "15:30")
                .jornada(e.getJornada() != null ? e.getJornada() : 1)
                .estadio(e.getEstadio() != null ? e.getEstadio() : "Estadio " + e.getEquipoLocal().getNombre())
                .arbitro(e.getArbitro() != null ? e.getArbitro() : "Árbitro Oficial")
                .estado(e.getEstado() != null ? e.getEstado() : "FINALIZADO")
                .tarjetasAmarillasLocal(e.getTarjetasAmarillasLocal() != null ? e.getTarjetasAmarillasLocal() : 0)
                .tarjetasAmarillasVisitante(e.getTarjetasAmarillasVisitante() != null ? e.getTarjetasAmarillasVisitante() : 0)
                .tarjetasRojasLocal(e.getTarjetasRojasLocal() != null ? e.getTarjetasRojasLocal() : 0)
                .tarjetasRojasVisitante(e.getTarjetasRojasVisitante() != null ? e.getTarjetasRojasVisitante() : 0)
                .tirosLocal(e.getTirosLocal() != null ? e.getTirosLocal() : 0)
                .tirosVisitante(e.getTirosVisitante() != null ? e.getTirosVisitante() : 0)
                .posesionLocal(e.getPosesionLocal() != null ? e.getPosesionLocal() : 50)
                .posesionVisitante(e.getPosesionVisitante() != null ? e.getPosesionVisitante() : 50)
                .build();
    }
}

