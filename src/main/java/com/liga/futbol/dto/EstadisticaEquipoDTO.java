package com.liga.futbol.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EstadisticaEquipoDTO {

    private Long equipoId;
    private String equipoNombre;

    @JsonProperty("PJ")
    private Integer pj;

    @JsonProperty("PG")
    private Integer pg;

    @JsonProperty("PE")
    private Integer pe;

    @JsonProperty("PP")
    private Integer pp;

    @JsonProperty("GF")
    private Integer gf;

    @JsonProperty("GC")
    private Integer gc;

    private Integer diferenciaGoles;
    private Integer puntos;
    private List<String> racha;
}
