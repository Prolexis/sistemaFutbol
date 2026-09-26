package com.liga.futbol.service.impl;

import com.liga.futbol.dto.EstadisticaEquipoDTO;
import com.liga.futbol.dto.ResumenTorneoDTO;
import com.liga.futbol.entity.Encuentro;
import com.liga.futbol.entity.Equipo;
import com.liga.futbol.exception.ResourceNotFoundException;
import com.liga.futbol.repository.EncuentroRepository;
import com.liga.futbol.repository.EquipoRepository;
import com.liga.futbol.service.StatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StatsServiceImpl implements StatsService {

    private final EquipoRepository equipoRepository;
    private final EncuentroRepository encuentroRepository;

    @Override
    public EstadisticaEquipoDTO obtenerEstadisticasEquipo(Long equipoId) {
        Equipo equipo = equipoRepository.findById(equipoId)
                .orElseThrow(() -> new ResourceNotFoundException("Equipo no encontrado con ID: " + equipoId));

        List<Encuentro> encuentros = encuentroRepository.findAll();

        return calcularEstadisticasEquipo(equipo, encuentros);
    }

    @Override
    public ResumenTorneoDTO obtenerResumenTorneo() {
        List<Equipo> equipos = equipoRepository.findAll();
        List<Encuentro> encuentros = encuentroRepository.findAll();

        int totalPartidos = encuentros.size();
        int totalGoles = encuentros.stream()
                .mapToInt(e -> (e.getGolesLocal() != null ? e.getGolesLocal() : 0) +
                               (e.getGolesVisitante() != null ? e.getGolesVisitante() : 0))
                .sum();

        double promedio = 0.0;
        if (totalPartidos > 0) {
            promedio = Math.round(((double) totalGoles / totalPartidos) * 100.0) / 100.0;
        }

        String equipoMasGoleador = "N/A";
        int maxGoles = 0;

        String equipoMejorDefensa = "N/A";
        int minGolesRecibidos = Integer.MAX_VALUE;

        // Calculamos estadísticas de cada equipo
        List<EstadisticaEquipoDTO> statsEquipos = new ArrayList<>();
        for (Equipo equipo : equipos) {
            statsEquipos.add(calcularEstadisticasEquipo(equipo, encuentros));
        }

        // Determinar líder de goleo (más goles a favor)
        for (EstadisticaEquipoDTO st : statsEquipos) {
            if (st.getGf() > maxGoles || equipoMasGoleador.equals("N/A")) {
                maxGoles = st.getGf();
                equipoMasGoleador = st.getEquipoNombre();
            }
        }

        // Determinar mejor defensa (menos goles en contra)
        // Se priorizan equipos que tengan partidos disputados (pj > 0)
        List<EstadisticaEquipoDTO> equiposConPartidos = statsEquipos.stream()
                .filter(st -> st.getPj() > 0)
                .collect(Collectors.toList());

        List<EstadisticaEquipoDTO> poolDefensa = equiposConPartidos.isEmpty() ? statsEquipos : equiposConPartidos;

        for (EstadisticaEquipoDTO st : poolDefensa) {
            if (st.getGc() < minGolesRecibidos) {
                minGolesRecibidos = st.getGc();
                equipoMejorDefensa = st.getEquipoNombre();
            }
        }

        if (minGolesRecibidos == Integer.MAX_VALUE) {
            minGolesRecibidos = 0;
        }

        return ResumenTorneoDTO.builder()
                .totalGoles(totalGoles)
                .promedioGolesPorPartido(promedio)
                .equipoMasGoleador(equipoMasGoleador)
                .golesEquipoMasGoleador(maxGoles)
                .equipoMejorDefensa(equipoMejorDefensa)
                .golesRecibidosMejorDefensa(minGolesRecibidos)
                .totalPartidos(totalPartidos)
                .build();
    }

    private EstadisticaEquipoDTO calcularEstadisticasEquipo(Equipo equipo, List<Encuentro> todosEncuentros) {
        Long id = equipo.getId();

        // Filtrar encuentros disputados por este equipo
        List<Encuentro> encuentrosEquipo = todosEncuentros.stream()
                .filter(e -> (e.getEquipoLocal() != null && id.equals(e.getEquipoLocal().getId())) ||
                             (e.getEquipoVisitante() != null && id.equals(e.getEquipoVisitante().getId())))
                .sorted(Comparator
                        .comparing(Encuentro::getFecha, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Encuentro::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.toList());

        int pj = 0;
        int pg = 0;
        int pe = 0;
        int pp = 0;
        int gf = 0;
        int gc = 0;
        int puntos = 0;
        List<String> rachaCompleta = new ArrayList<>();

        for (Encuentro e : encuentrosEquipo) {
            boolean esLocal = e.getEquipoLocal() != null && id.equals(e.getEquipoLocal().getId());
            int gFavor = esLocal ? e.getGolesLocal() : e.getGolesVisitante();
            int gContra = esLocal ? e.getGolesVisitante() : e.getGolesLocal();

            pj++;
            gf += gFavor;
            gc += gContra;

            if (gFavor > gContra) {
                pg++;
                puntos += 3;
                rachaCompleta.add("G");
            } else if (gFavor == gContra) {
                pe++;
                puntos += 1;
                rachaCompleta.add("E");
            } else {
                pp++;
                rachaCompleta.add("P");
            }
        }

        // Últimos 5 resultados (racha)
        List<String> ultimos5;
        if (rachaCompleta.size() <= 5) {
            ultimos5 = new ArrayList<>(rachaCompleta);
        } else {
            ultimos5 = new ArrayList<>(rachaCompleta.subList(rachaCompleta.size() - 5, rachaCompleta.size()));
        }

        return EstadisticaEquipoDTO.builder()
                .equipoId(equipo.getId())
                .equipoNombre(equipo.getNombre())
                .pj(pj)
                .pg(pg)
                .pe(pe)
                .pp(pp)
                .gf(gf)
                .gc(gc)
                .diferenciaGoles(gf - gc)
                .puntos(puntos)
                .racha(ultimos5)
                .build();
    }
}
