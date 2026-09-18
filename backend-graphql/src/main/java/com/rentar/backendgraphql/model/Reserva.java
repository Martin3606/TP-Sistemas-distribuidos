package com.rentar.backendgraphql.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Entity
@Table(name = "reserva")
public class Reserva {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vehiculo_id", nullable = false)
    private Vehiculo vehiculo;

    @Column(name = "fecha_inicio", nullable = false)
    private LocalDateTime fechaInicio;

    @Column(name = "fecha_fin", nullable = false)
    private LocalDateTime fechaFin;

    @Column(name = "precio_diario_snapshot", nullable = false, precision = 10, scale = 2)
    private BigDecimal precioDiarioSnapshot;

    @Column(name = "importe_total", nullable = false, precision = 10, scale = 2)
    private BigDecimal importeTotal;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoReserva estado = EstadoReserva.CONFIRMADA;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    public Reserva() {
    }

    public Reserva(Integer id, Cliente cliente, Vehiculo vehiculo, LocalDateTime fechaInicio, LocalDateTime fechaFin, BigDecimal precioDiarioSnapshot, BigDecimal importeTotal, EstadoReserva estado) {
        this.id = id;
        this.cliente = cliente;
        this.vehiculo = vehiculo;
        this.fechaInicio = fechaInicio;
        this.fechaFin = fechaFin;
        this.precioDiarioSnapshot = precioDiarioSnapshot;
        this.importeTotal = importeTotal;
        this.estado = estado;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Cliente getCliente() {
        return cliente;
    }

    public void setCliente(Cliente cliente) {
        this.cliente = cliente;
    }

    public Vehiculo getVehiculo() {
        return vehiculo;
    }

    public void setVehiculo(Vehiculo vehiculo) {
        this.vehiculo = vehiculo;
    }

    public LocalDateTime getFechaInicio() {
        return fechaInicio;
    }

    public void setFechaInicio(LocalDateTime fechaInicio) {
        this.fechaInicio = fechaInicio;
    }

    public LocalDateTime getFechaFin() {
        return fechaFin;
    }

    public void setFechaFin(LocalDateTime fechaFin) {
        this.fechaFin = fechaFin;
    }

    public BigDecimal getPrecioDiarioSnapshot() {
        return precioDiarioSnapshot;
    }

    public void setPrecioDiarioSnapshot(BigDecimal precioDiarioSnapshot) {
        this.precioDiarioSnapshot = precioDiarioSnapshot;
    }

    public BigDecimal getImporteTotal() {
        return importeTotal;
    }

    public void setImporteTotal(BigDecimal importeTotal) {
        this.importeTotal = importeTotal;
    }

    public EstadoReserva getEstado() {
        return estado;
    }

    public void setEstado(EstadoReserva estado) {
        this.estado = estado;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    /**
     * Calcula la cantidad de días transcurridos entre fechaInicio y fechaFin.
     * Retorna como mínimo 1 día si fechaFin y fechaInicio corresponden al mismo día.
     */
    public int getCantidadDias() {
        if (fechaInicio == null || fechaFin == null) {
            return 0;
        }
        long dias = ChronoUnit.DAYS.between(fechaInicio.toLocalDate(), fechaFin.toLocalDate());
        return dias <= 0 ? 1 : (int) dias;
    }
}
