package com.rentar.rentalservice.repository;

import com.rentar.rentalservice.model.EstadoReserva;
import com.rentar.rentalservice.model.Reserva;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ReservaRepository extends JpaRepository<Reserva, Integer> {

    List<Reserva> findByClienteIdOrderByFechaInicioDesc(Integer clienteId);

    /** Hay una reserva en el estado indicado que se solapa con [inicio, fin)? */
    @Query("select count(r) > 0 from Reserva r "
         + "where r.vehiculoId = :vehiculoId and r.estado = :estado "
         + "and r.fechaInicio < :fin and r.fechaFin > :inicio")
    boolean existeSolapamiento(@Param("vehiculoId") Integer vehiculoId,
                               @Param("estado") EstadoReserva estado,
                               @Param("inicio") LocalDateTime inicio,
                               @Param("fin") LocalDateTime fin);
}
