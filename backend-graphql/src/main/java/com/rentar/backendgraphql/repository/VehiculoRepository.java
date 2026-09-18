package com.rentar.backendgraphql.repository;

import com.rentar.backendgraphql.model.TipoVehiculo;
import com.rentar.backendgraphql.model.Vehiculo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface VehiculoRepository extends JpaRepository<Vehiculo, Integer> {

    @Query("SELECT v FROM Vehiculo v WHERE v.activo = true " +
           "AND (:tipoVehiculo IS NULL OR v.tipoVehiculo = :tipoVehiculo) " +
           "AND (:marca IS NULL OR LOWER(v.marca) LIKE LOWER(CONCAT('%', :marca, '%'))) " +
           "AND (:modelo IS NULL OR LOWER(v.modelo) LIKE LOWER(CONCAT('%', :modelo, '%'))) " +
           "AND (:precioMin IS NULL OR v.precioDiario >= :precioMin) " +
           "AND (:precioMax IS NULL OR v.precioDiario <= :precioMax) " +
           "AND v.id NOT IN (" +
           "    SELECT r.vehiculo.id FROM Reserva r " +
           "    WHERE r.estado = com.rentar.backendgraphql.model.EstadoReserva.CONFIRMADA " +
           "    AND r.fechaInicio < :fechaFin " +
           "    AND r.fechaFin > :fechaInicio" +
           ")")
    List<Vehiculo> findVehiculosDisponibles(
            @Param("fechaInicio") LocalDateTime fechaInicio,
            @Param("fechaFin") LocalDateTime fechaFin,
            @Param("tipoVehiculo") TipoVehiculo tipoVehiculo,
            @Param("marca") String marca,
            @Param("modelo") String modelo,
            @Param("precioMin") BigDecimal precioMin,
            @Param("precioMax") BigDecimal precioMax
    );
}
