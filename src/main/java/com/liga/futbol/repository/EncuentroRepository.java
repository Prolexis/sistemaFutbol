package com.liga.futbol.repository;

import com.liga.futbol.entity.Encuentro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EncuentroRepository extends JpaRepository<Encuentro, Long> {

    List<Encuentro> findAllByOrderByFechaDescIdDesc();

    @Query("SELECT COUNT(e) > 0 FROM Encuentro e WHERE e.equipoLocal.id = :equipoId OR e.equipoVisitante.id = :equipoId")
    boolean existsByEquipoId(@Param("equipoId") Long equipoId);
}
