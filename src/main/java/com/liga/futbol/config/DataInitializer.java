package com.liga.futbol.config;

import com.liga.futbol.entity.Encuentro;
import com.liga.futbol.entity.Equipo;
import com.liga.futbol.repository.EncuentroRepository;
import com.liga.futbol.repository.EquipoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final EquipoRepository equipoRepository;
    private final EncuentroRepository encuentroRepository;

    @Override
    public void run(String... args) throws Exception {
        if (equipoRepository.count() == 0) {
            Equipo eq1 = equipoRepository.save(Equipo.builder().nombre("Universitario de Deportes").ciudad("Lima").estadio("Estadio Monumental U").build());
            Equipo eq2 = equipoRepository.save(Equipo.builder().nombre("Alianza Lima").ciudad("Lima").estadio("Estadio Alejandro Villanueva").build());
            Equipo eq3 = equipoRepository.save(Equipo.builder().nombre("Sporting Cristal").ciudad("Lima").estadio("Estadio Alberto Gallardo").build());
            Equipo eq4 = equipoRepository.save(Equipo.builder().nombre("FBC Melgar").ciudad("Arequipa").estadio("Estadio Monumental de la UNSA").build());
            Equipo eq5 = equipoRepository.save(Equipo.builder().nombre("Cienciano").ciudad("Cusco").estadio("Estadio Garcilaso de la Vega").build());
            Equipo eq6 = equipoRepository.save(Equipo.builder().nombre("Universidad César Vallejo").ciudad("Trujillo").estadio("Estadio Mansiche").build());

            List<Encuentro> encuentros = Arrays.asList(
                Encuentro.builder().equipoLocal(eq1).equipoVisitante(eq2).golesLocal(2).golesVisitante(1).fecha(LocalDate.parse("2026-09-01")).build(),
                Encuentro.builder().equipoLocal(eq3).equipoVisitante(eq4).golesLocal(3).golesVisitante(0).fecha(LocalDate.parse("2026-09-05")).build(),
                Encuentro.builder().equipoLocal(eq5).equipoVisitante(eq6).golesLocal(1).golesVisitante(1).fecha(LocalDate.parse("2026-09-10")).build(),
                Encuentro.builder().equipoLocal(eq2).equipoVisitante(eq3).golesLocal(2).golesVisitante(2).fecha(LocalDate.parse("2026-09-15")).build(),
                Encuentro.builder().equipoLocal(eq4).equipoVisitante(eq1).golesLocal(1).golesVisitante(0).fecha(LocalDate.parse("2026-09-18")).build(),
                Encuentro.builder().equipoLocal(eq6).equipoVisitante(eq2).golesLocal(0).golesVisitante(2).fecha(LocalDate.parse("2026-09-22")).build()
            );
            encuentroRepository.saveAll(encuentros);
        }
    }
}
