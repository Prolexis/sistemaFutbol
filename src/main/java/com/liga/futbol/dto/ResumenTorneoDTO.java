package com.liga.futbol.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ResumenTorneoDTO {

    private Integer totalGoles;
    private Double promedioGolesPorPartido;
    private String equipoMasGoleador;
    private Integer golesEquipoMasGoleador;
    private String equipoMejorDefensa;
    private Integer golesRecibidosMejorDefensa;
    private Integer totalPartidos;
}
