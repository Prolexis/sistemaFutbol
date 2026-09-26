package com.liga.futbol.service.impl;

import com.liga.futbol.dto.EstadisticaEquipoDTO;
import com.liga.futbol.dto.ResumenTorneoDTO;
import com.liga.futbol.entity.Encuentro;
import com.liga.futbol.entity.Equipo;
import com.liga.futbol.exception.RecursoNoEncontradoException;
import com.liga.futbol.repository.EncuentroRepository;
import com.liga.futbol.repository.EquipoRepository;
import com.liga.futbol.dto.TablaPosicionDTO;
import com.liga.futbol.service.EncuentroService;
import com.liga.futbol.service.StatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StatsServiceImpl implements StatsService {

    private final EquipoRepository equipoRepository;
    private final EncuentroRepository encuentroRepository;
    private final EncuentroService encuentroService;

    @Override
    public EstadisticaEquipoDTO obtenerEstadisticasEquipo(Long equipoId) {
        Equipo equipo = equipoRepository.findById(equipoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Equipo no encontrado con ID: " + equipoId));

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

    @Override
    public byte[] exportarPosicionesCsv() {
        List<TablaPosicionDTO> posiciones = encuentroService.obtenerTablaPosiciones();
        StringBuilder sb = new StringBuilder();

        // BOM UTF-8 para garantizar codificación adecuada en editores y Excel
        sb.append('\ufeff');

        // Encabezado según requerimiento: Puesto,Equipo,Ciudad,PJ,PG,PE,PP,GF,GC,DIF,Puntos
        sb.append("Puesto,Equipo,Ciudad,PJ,PG,PE,PP,GF,GC,DIF,Puntos\n");

        for (TablaPosicionDTO pos : posiciones) {
            sb.append(pos.getPosicion() != null ? pos.getPosicion() : "").append(",");
            sb.append(escapeCsv(pos.getEquipoNombre())).append(",");
            sb.append(escapeCsv(pos.getCiudad())).append(",");
            sb.append(pos.getPartidosJugados() != null ? pos.getPartidosJugados() : 0).append(",");
            sb.append(pos.getPartidosGanados() != null ? pos.getPartidosGanados() : 0).append(",");
            sb.append(pos.getPartidosEmpatados() != null ? pos.getPartidosEmpatados() : 0).append(",");
            sb.append(pos.getPartidosPerdidos() != null ? pos.getPartidosPerdidos() : 0).append(",");
            sb.append(pos.getGolesAFavor() != null ? pos.getGolesAFavor() : 0).append(",");
            sb.append(pos.getGolesEnContra() != null ? pos.getGolesEnContra() : 0).append(",");
            sb.append(pos.getDiferenciaGoles() != null ? pos.getDiferenciaGoles() : 0).append(",");
            sb.append(pos.getPuntos() != null ? pos.getPuntos() : 0).append("\n");
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    private String escapeCsv(String valor) {
        if (valor == null) {
            return "\"\"";
        }
        if (valor.contains(",") || valor.contains("\"") || valor.contains("\n") || valor.contains("\r")) {
            return "\"" + valor.replace("\"", "\"\"") + "\"";
        }
        return "\"" + valor + "\"";
    }
}
