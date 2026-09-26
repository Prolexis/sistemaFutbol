package com.liga.futbol.service.impl;

import com.liga.futbol.dto.EquipoDTO;
import com.liga.futbol.entity.Equipo;
import com.liga.futbol.exception.BusinessRuleException;
import com.liga.futbol.exception.ResourceNotFoundException;
import com.liga.futbol.repository.EncuentroRepository;
import com.liga.futbol.repository.EquipoRepository;
import com.liga.futbol.service.EquipoService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class EquipoServiceImpl implements EquipoService {

    private final EquipoRepository equipoRepository;
    private final EncuentroRepository encuentroRepository;

    @Override
    public EquipoDTO crearEquipo(EquipoDTO equipoDTO) {
        String nombreTrimmed = equipoDTO.getNombre().trim();
        String ciudadTrimmed = equipoDTO.getCiudad().trim();

        if (equipoRepository.existsByNombreIgnoreCase(nombreTrimmed)) {
            throw new BusinessRuleException("Ya existe un equipo registrado con el nombre: " + nombreTrimmed);
        }

        Equipo equipo = Equipo.builder()
                .nombre(nombreTrimmed)
                .ciudad(ciudadTrimmed)
                .build();

        Equipo guardado = equipoRepository.save(equipo);
        return mapToDTO(guardado);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EquipoDTO> listarEquipos() {
        return equipoRepository.findAllByOrderByNombreAsc().stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public EquipoDTO obtenerEquipoPorId(Long id) {
        Equipo equipo = equipoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No se encontró el equipo con ID: " + id));
        return mapToDTO(equipo);
    }

    @Override
    public EquipoDTO actualizarEquipo(Long id, EquipoDTO equipoDTO) {
        Equipo equipo = equipoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No se encontró el equipo con ID: " + id));

        String nuevoNombre = equipoDTO.getNombre().trim();
        String nuevaCiudad = equipoDTO.getCiudad().trim();

        if (equipoRepository.existsByNombreIgnoreCaseAndIdNot(nuevoNombre, id)) {
            throw new BusinessRuleException("Ya existe otro equipo registrado con el nombre: " + nuevoNombre);
        }

        equipo.setNombre(nuevoNombre);
        equipo.setCiudad(nuevaCiudad);

        Equipo actualizado = equipoRepository.save(equipo);
        return mapToDTO(actualizado);
    }

    @Override
    public void eliminarEquipo(Long id) {
        if (!equipoRepository.existsById(id)) {
            throw new ResourceNotFoundException("No se encontró el equipo con ID: " + id);
        }

        if (encuentroRepository.existsByEquipoId(id)) {
            throw new BusinessRuleException("No se puede eliminar el equipo porque tiene encuentros registrados en la liga. Elimine primero los encuentros asociados.");
        }

        equipoRepository.deleteById(id);
    }

    private EquipoDTO mapToDTO(Equipo equipo) {
        return EquipoDTO.builder()
                .id(equipo.getId())
                .nombre(equipo.getNombre())
                .ciudad(equipo.getCiudad())
                .build();
    }
}
