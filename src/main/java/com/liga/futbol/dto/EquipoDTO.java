package com.liga.futbol.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EquipoDTO {

    private Long id;

    @NotBlank(message = "El nombre del equipo no puede estar vacío.")
    @Size(min = 2, max = 100, message = "El nombre del equipo debe tener entre 2 y 100 caracteres.")
    private String nombre;

    @NotBlank(message = "La ciudad del equipo no puede estar vacía.")
    @Size(min = 2, max = 100, message = "La ciudad debe tener entre 2 y 100 caracteres.")
    private String ciudad;
}
