package com.liga.futbol.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TablaPosicionDTO {

    private Integer posicion;
    private Long equipoId;
    private String equipoNombre;
    private String ciudad;
    private Integer partidosJugados;
    private Integer partidosGanados;
    private Integer partidosEmpatados;
    private Integer partidosPerdidos;
    private Integer golesAFavor;
    private Integer golesEnContra;
    private Integer diferenciaGoles;
    private Integer puntos;
}
