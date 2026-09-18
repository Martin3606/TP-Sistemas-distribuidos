package com.rentar.backendgraphql.repository;

import com.rentar.backendgraphql.model.EstadoReserva;
import com.rentar.backendgraphql.model.Reserva;
import com.rentar.backendgraphql.model.TipoVehiculo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ReservaRepository extends JpaRepository<Reserva, Integer> {

    @Query("SELECT r FROM Reserva r " +
           "JOIN FETCH r.cliente c " +
           "JOIN FETCH r.vehiculo v " +
           "WHERE (:clienteId IS NULL OR c.id = :clienteId) " +
           "AND (:vehiculoId IS NULL OR v.id = :vehiculoId) " +
           "AND (:tipoVehiculo IS NULL OR v.tipoVehiculo = :tipoVehiculo) " +
           "AND (:estado IS NULL OR r.estado = :estado) " +
           "AND (:fechaInicioDesde IS NULL OR r.fechaInicio >= :fechaInicioDesde) " +
           "AND (:fechaFinHasta IS NULL OR r.fechaFin <= :fechaFinHasta) " +
           "ORDER BY r.fechaInicio DESC")
    List<Reserva> findReservasConFiltros(
            @Param("clienteId") Integer clienteId,
            @Param("vehiculoId") Integer vehiculoId,
            @Param("tipoVehiculo") TipoVehiculo tipoVehiculo,
            @Param("estado") EstadoReserva estado,
            @Param("fechaInicioDesde") LocalDateTime fechaInicioDesde,
            @Param("fechaFinHasta") LocalDateTime fechaFinHasta
    );

    @Query("SELECT r FROM Reserva r " +
           "JOIN FETCH r.cliente c " +
           "JOIN FETCH r.vehiculo v " +
           "WHERE c.id = :clienteId " +
           "ORDER BY r.fechaInicio DESC")
    List<Reserva> findHistorialByClienteId(@Param("clienteId") Integer clienteId);
}
