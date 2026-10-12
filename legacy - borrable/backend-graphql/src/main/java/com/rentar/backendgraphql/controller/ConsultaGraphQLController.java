package com.rentar.backendgraphql.controller;

import com.rentar.backendgraphql.config.UserAuth;
import com.rentar.backendgraphql.dto.FiltroDisponibilidadInput;
import com.rentar.backendgraphql.dto.FiltroReservaInput;
import com.rentar.backendgraphql.model.Reserva;
import com.rentar.backendgraphql.model.Vehiculo;
import com.rentar.backendgraphql.repository.ReservaRepository;
import com.rentar.backendgraphql.repository.VehiculoRepository;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.ContextValue;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Controller
public class ConsultaGraphQLController {

    private final VehiculoRepository vehiculoRepository;
    private final ReservaRepository reservaRepository;

    public ConsultaGraphQLController(VehiculoRepository vehiculoRepository, ReservaRepository reservaRepository) {
        this.vehiculoRepository = vehiculoRepository;
        this.reservaRepository = reservaRepository;
    }

    /**
     * [Requerimiento 2 - CLIENTE]
     * Consulta de disponibilidad de vehículos por período obligatorios y filtros opcionales.
     */
    @QueryMapping
    public List<Vehiculo> consultarDisponibilidad(@Argument FiltroDisponibilidadInput filtro) {
        if (filtro == null) {
            throw new IllegalArgumentException("El objeto de filtro no puede ser nulo.");
        }

        LocalDateTime fechaInicio = filtro.getFechaInicioAsLocalDateTime();
        LocalDateTime fechaFin = filtro.getFechaFinAsLocalDateTime();

        if (fechaInicio == null || fechaFin == null) {
            throw new IllegalArgumentException("Las fechas de inicio y finalización son obligatorias.");
        }

        if (fechaFin.isBefore(fechaInicio) || fechaFin.isEqual(fechaInicio)) {
            throw new IllegalArgumentException("La fecha de finalización debe ser posterior a la fecha de inicio.");
        }

        return vehiculoRepository.findVehiculosDisponibles(
                fechaInicio,
                fechaFin,
                filtro.getTipoVehiculo(),
                filtro.getMarca(),
                filtro.getModelo(),
                filtro.getPrecioMin(),
                filtro.getPrecioMax()
        );
    }

    /**
     * [Requerimiento 5 - CLIENTE / ADMINISTRADOR]
     * Consulta de reservas registradas con filtros opcionales.
     * Si el usuario es un CLIENTE, fuerza el filtro a su propio clienteId por seguridad.
     */
    @QueryMapping
    public List<Reserva> consultarReservas(
            @Argument FiltroReservaInput filtro,
            @ContextValue(name = "userAuth", required = false) UserAuth userAuth
    ) {
        Integer clienteIdFiltro = filtro != null ? filtro.getClienteId() : null;

        // Si es CLIENTE, restringir únicamente a sus propias reservas
        if (userAuth != null && userAuth.isCliente() && userAuth.getClienteId() != null) {
            clienteIdFiltro = userAuth.getClienteId();
        }

        if (filtro == null) {
            return reservaRepository.findReservasConFiltros(clienteIdFiltro, null, null, null, null, null);
        }

        return reservaRepository.findReservasConFiltros(
                clienteIdFiltro,
                filtro.getVehiculoId(),
                filtro.getTipoVehiculo(),
                filtro.getEstado(),
                filtro.getFechaInicioDesdeAsLocalDateTime(),
                filtro.getFechaFinHastaAsLocalDateTime()
        );
    }

    /**
     * [Requerimiento 7 - CLIENTE]
     * Historial de alquileres para un cliente específico.
     * Si el usuario es CLIENTE, fuerza la consulta a su propio clienteId.
     */
    @QueryMapping
    public List<Reserva> historialAlquileres(
            @Argument Integer clienteId,
            @ContextValue(name = "userAuth", required = false) UserAuth userAuth
    ) {
        Integer targetClienteId = clienteId;
        if (userAuth != null && userAuth.isCliente() && userAuth.getClienteId() != null) {
            targetClienteId = userAuth.getClienteId();
        }

        if (targetClienteId == null) {
            return Collections.emptyList();
        }
        return reservaRepository.findHistorialByClienteId(targetClienteId);
    }

    /**
     * Adaptador para serializar fechaInicio como String ISO-8601 en GraphQL.
     */
    @SchemaMapping(typeName = "Reserva", field = "fechaInicio")
    public String getFechaInicioFormatted(Reserva reserva) {
        return reserva.getFechaInicio() != null ? reserva.getFechaInicio().toString() : null;
    }

    /**
     * Adaptador para serializar fechaFin como String ISO-8601 en GraphQL.
     */
    @SchemaMapping(typeName = "Reserva", field = "fechaFin")
    public String getFechaFinFormatted(Reserva reserva) {
        return reserva.getFechaFin() != null ? reserva.getFechaFin().toString() : null;
    }

    /**
     * Adaptador para serializar fechaNacimiento como String YYYY-MM-DD en GraphQL.
     */
    @SchemaMapping(typeName = "Cliente", field = "fechaNacimiento")
    public String getFechaNacimientoFormatted(com.rentar.backendgraphql.model.Cliente cliente) {
        return cliente.getFechaNacimiento() != null ? cliente.getFechaNacimiento().toString() : null;
    }
}
