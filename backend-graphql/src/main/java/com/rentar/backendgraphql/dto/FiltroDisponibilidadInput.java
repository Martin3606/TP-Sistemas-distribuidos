package com.rentar.backendgraphql.dto;

import com.rentar.backendgraphql.model.TipoVehiculo;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class FiltroDisponibilidadInput {

    private String fechaInicio;
    private String fechaFin;
    private TipoVehiculo tipoVehiculo;
    private String marca;
    private String modelo;
    private BigDecimal precioMin;
    private BigDecimal precioMax;

    public FiltroDisponibilidadInput() {
    }

    public String getFechaInicio() {
        return fechaInicio;
    }

    public void setFechaInicio(String fechaInicio) {
        this.fechaInicio = fechaInicio;
    }

    public String getFechaFin() {
        return fechaFin;
    }

    public void setFechaFin(String fechaFin) {
        this.fechaFin = fechaFin;
    }

    public TipoVehiculo getTipoVehiculo() {
        return tipoVehiculo;
    }

    public void setTipoVehiculo(TipoVehiculo tipoVehiculo) {
        this.tipoVehiculo = tipoVehiculo;
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

    public BigDecimal getPrecioMin() {
        return precioMin;
    }

    public void setPrecioMin(BigDecimal precioMin) {
        this.precioMin = precioMin;
    }

    public BigDecimal getPrecioMax() {
        return precioMax;
    }

    public void setPrecioMax(BigDecimal precioMax) {
        this.precioMax = precioMax;
    }

    public LocalDateTime getFechaInicioAsLocalDateTime() {
        if (fechaInicio == null || fechaInicio.isBlank()) {
            return null;
        }
        return parseDateTime(fechaInicio);
    }

    public LocalDateTime getFechaFinAsLocalDateTime() {
        if (fechaFin == null || fechaFin.isBlank()) {
            return null;
        }
        return parseDateTime(fechaFin);
    }

    private LocalDateTime parseDateTime(String input) {
        if (input.contains("T")) {
            return LocalDateTime.parse(input, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        }
        return LocalDateTime.parse(input + "T00:00:00", DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }
}
