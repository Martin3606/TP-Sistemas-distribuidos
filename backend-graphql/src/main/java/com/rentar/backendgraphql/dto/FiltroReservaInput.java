package com.rentar.backendgraphql.dto;

import com.rentar.backendgraphql.model.EstadoReserva;
import com.rentar.backendgraphql.model.TipoVehiculo;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class FiltroReservaInput {

    private Integer clienteId;
    private Integer vehiculoId;
    private TipoVehiculo tipoVehiculo;
    private EstadoReserva estado;
    private String fechaInicioDesde;
    private String fechaFinHasta;

    public FiltroReservaInput() {
    }

    public Integer getClienteId() {
        return clienteId;
    }

    public void setClienteId(Integer clienteId) {
        this.clienteId = clienteId;
    }

    public Integer getVehiculoId() {
        return vehiculoId;
    }

    public void setVehiculoId(Integer vehiculoId) {
        this.vehiculoId = vehiculoId;
    }

    public TipoVehiculo getTipoVehiculo() {
        return tipoVehiculo;
    }

    public void setTipoVehiculo(TipoVehiculo tipoVehiculo) {
        this.tipoVehiculo = tipoVehiculo;
    }

    public EstadoReserva getEstado() {
        return estado;
    }

    public void setEstado(EstadoReserva estado) {
        this.estado = estado;
    }

    public String getFechaInicioDesde() {
        return fechaInicioDesde;
    }

    public void setFechaInicioDesde(String fechaInicioDesde) {
        this.fechaInicioDesde = fechaInicioDesde;
    }

    public String getFechaFinHasta() {
        return fechaFinHasta;
    }

    public void setFechaFinHasta(String fechaFinHasta) {
        this.fechaFinHasta = fechaFinHasta;
    }

    public LocalDateTime getFechaInicioDesdeAsLocalDateTime() {
        if (fechaInicioDesde == null || fechaInicioDesde.isBlank()) {
            return null;
        }
        return parseDateTime(fechaInicioDesde);
    }

    public LocalDateTime getFechaFinHastaAsLocalDateTime() {
        if (fechaFinHasta == null || fechaFinHasta.isBlank()) {
            return null;
        }
        return parseDateTime(fechaFinHasta);
    }

    private LocalDateTime parseDateTime(String input) {
        if (input.contains("T")) {
            return LocalDateTime.parse(input, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        }
        return LocalDateTime.parse(input + "T00:00:00", DateTimeFormatter.ISO_LOCAL_DATE_TIME);
    }
}
