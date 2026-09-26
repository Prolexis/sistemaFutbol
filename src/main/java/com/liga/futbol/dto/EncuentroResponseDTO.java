package com.liga.futbol.dto;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EncuentroResponseDTO {

    private Long id;
    private EquipoDTO equipoLocal;
    private EquipoDTO equipoVisitante;
    private Integer golesLocal;
    private Integer golesVisitante;
    private LocalDate fecha;
}
