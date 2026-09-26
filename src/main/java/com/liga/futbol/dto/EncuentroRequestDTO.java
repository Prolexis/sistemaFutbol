package com.liga.futbol.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EncuentroRequestDTO {

    @NotNull(message = "El equipo local es obligatorio.")
    private Long equipoLocalId;

    @NotNull(message = "El equipo visitante es obligatorio.")
    private Long equipoVisitanteId;

    @NotNull(message = "Los goles del equipo local son obligatorios.")
    @Min(value = 0, message = "Los goles del equipo local deben ser mayores o iguales a 0.")
    private Integer golesLocal;

    @NotNull(message = "Los goles del equipo visitante son obligatorios.")
    @Min(value = 0, message = "Los goles del equipo visitante deben ser mayores o iguales a 0.")
    private Integer golesVisitante;

    @NotNull(message = "La fecha del encuentro es obligatoria.")
    private LocalDate fecha;
}
