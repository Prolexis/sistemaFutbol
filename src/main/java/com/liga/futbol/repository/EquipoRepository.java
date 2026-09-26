package com.liga.futbol.repository;

import com.liga.futbol.entity.Equipo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EquipoRepository extends JpaRepository<Equipo, Long> {

    boolean existsByNombreIgnoreCase(String nombre);

    boolean existsByNombreIgnoreCaseAndIdNot(String nombre, Long id);

    Optional<Equipo> findByNombreIgnoreCase(String nombre);

    List<Equipo> findAllByOrderByNombreAsc();

    // Búsqueda parcial por nombre, insensible a mayúsculas (usado por /api/equipos/buscar)
    List<Equipo> findByNombreContainingIgnoreCase(String nombre);
}
