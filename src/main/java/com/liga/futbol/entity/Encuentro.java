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

    @Column(length = 10)
    private String hora;

    @Column
    private Integer jornada;

    @Column(length = 150)
    private String estadio;

    @Column(length = 100)
    private String arbitro;

    @Column(length = 30)
    private String estado; // FINALIZADO, PROGRAMADO, EN_JUEGO, SUSPENDIDO

    @Column(name = "tarjetas_amarillas_local")
    private Integer tarjetasAmarillasLocal;

    @Column(name = "tarjetas_amarillas_visitante")
    private Integer tarjetasAmarillasVisitante;

    @Column(name = "tarjetas_rojas_local")
    private Integer tarjetasRojasLocal;

    @Column(name = "tarjetas_rojas_visitante")
    private Integer tarjetasRojasVisitante;

    @Column(name = "tiros_local")
    private Integer tirosLocal;

    @Column(name = "tiros_visitante")
    private Integer tirosVisitante;

    @Column(name = "posesion_local")
    private Integer posesionLocal;

    @Column(name = "posesion_visitante")
    private Integer posesionVisitante;
}

