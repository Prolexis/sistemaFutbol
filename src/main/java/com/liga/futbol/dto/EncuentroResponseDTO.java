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
    private String hora;
    private Integer jornada;
    private String estadio;
    private String arbitro;
    private String estado;

    private Integer tarjetasAmarillasLocal;
    private Integer tarjetasAmarillasVisitante;
    private Integer tarjetasRojasLocal;
    private Integer tarjetasRojasVisitante;

    private Integer tirosLocal;
    private Integer tirosVisitante;
    private Integer posesionLocal;
    private Integer posesionVisitante;
}

