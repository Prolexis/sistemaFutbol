package com.liga.futbol.repository;

import com.liga.futbol.entity.Encuentro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface EncuentroRepository extends JpaRepository<Encuentro, Long> {

    List<Encuentro> findAllByOrderByFechaDescIdDesc();

    @Query("SELECT COUNT(e) > 0 FROM Encuentro e WHERE e.equipoLocal.id = :equipoId OR e.equipoVisitante.id = :equipoId")
    boolean existsByEquipoId(@Param("equipoId") Long equipoId);

    // --- Nuevos métodos para filtrado (no afectan los existentes) ---

    /** Filtra encuentros de un equipo específico (como local O visitante) */
    List<Encuentro> findByEquipoLocalIdOrEquipoVisitanteIdOrderByFechaDescIdDesc(
            Long equipoLocalId, Long equipoVisitanteId);

    /** Filtra encuentros dentro de un rango de fechas */
    List<Encuentro> findByFechaBetweenOrderByFechaDescIdDesc(
            LocalDate fechaInicio, LocalDate fechaFin);

    /** Filtra por equipo Y rango de fechas combinados */
    @Query("SELECT e FROM Encuentro e WHERE " +
           "(e.equipoLocal.id = :equipoId OR e.equipoVisitante.id = :equipoId) " +
           "AND e.fecha BETWEEN :fechaInicio AND :fechaFin " +
           "ORDER BY e.fecha DESC, e.id DESC")
    List<Encuentro> findByEquipoIdAndFechaBetween(
            @Param("equipoId") Long equipoId,
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin);

    /** Devuelve los últimos 5 encuentros registrados (ordenados por fecha de creación / ID descendente) */
    List<Encuentro> findTop5ByOrderByIdDesc();
}
