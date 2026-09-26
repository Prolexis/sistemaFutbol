package com.liga.futbol.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

@Entity
@Table(name = "encuentros")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Encuentro {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "equipo_local_id", nullable = false)
    private Equipo equipoLocal;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "equipo_visitante_id", nullable = false)
    private Equipo equipoVisitante;

    @Column(name = "goles_local", nullable = false)
    private Integer golesLocal;

    @Column(name = "goles_visitante", nullable = false)
    private Integer golesVisitante;

    @Column(nullable = false)
    private LocalDate fecha;
}
