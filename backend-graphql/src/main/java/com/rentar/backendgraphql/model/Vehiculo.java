package com.rentar.backendgraphql.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "vehiculo")
public class Vehiculo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true, length = 10)
    private String patente;

    @Column(nullable = false, length = 60)
    private String marca;

    @Column(nullable = false, length = 60)
    private String modelo;

    @Column(nullable = false)
    private Short anio;

    @Column(length = 30)
    private String color;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_vehiculo", nullable = false)
    private TipoVehiculo tipoVehiculo;

    @Column(name = "precio_diario", nullable = false, precision = 10, scale = 2)
    private BigDecimal precioDiario;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EstadoVehiculo estado = EstadoVehiculo.DISPONIBLE;

    @Column(nullable = false)
    private Boolean activo = true;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    public Vehiculo() {
    }

    public Vehiculo(Integer id, String patente, String marca, String modelo, Short anio, String color, TipoVehiculo tipoVehiculo, BigDecimal precioDiario, EstadoVehiculo estado, Boolean activo) {
        this.id = id;
        this.patente = patente;
        this.marca = marca;
        this.modelo = modelo;
        this.anio = anio;
        this.color = color;
        this.tipoVehiculo = tipoVehiculo;
        this.precioDiario = precioDiario;
        this.estado = estado;
        this.activo = activo;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getPatente() {
        return patente;
    }

    public void setPatente(String patente) {
        this.patente = patente;
    }

    public String getMarca() {
        return marca;
    }

    public void setMarca(String marca) {
        this.marca = marca;
    }

    public String getModelo() {
        return modelo;
    }

    public void setModelo(String modelo) {
        this.modelo = modelo;
    }

    public Short getAnio() {
        return anio;
    }

    public void setAnio(Short anio) {
        this.anio = anio;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public TipoVehiculo getTipoVehiculo() {
        return tipoVehiculo;
    }

    public void setTipoVehiculo(TipoVehiculo tipoVehiculo) {
        this.tipoVehiculo = tipoVehiculo;
    }

    public BigDecimal getPrecioDiario() {
        return precioDiario;
    }

    public void setPrecioDiario(BigDecimal precioDiario) {
        this.precioDiario = precioDiario;
    }

    public EstadoVehiculo getEstado() {
        return estado;
    }

    public void setEstado(EstadoVehiculo estado) {
        this.estado = estado;
    }

    public Boolean getActivo() {
        return activo;
    }

    public void setActivo(Boolean activo) {
        this.activo = activo;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
