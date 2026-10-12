package com.rentar.rentalservice.grpc;

import com.google.protobuf.Timestamp;
import com.rentar.rentalservice.model.EstadoReserva;
import com.rentar.rentalservice.model.Reserva;
import com.rentar.rentalservice.proto.*;
import com.rentar.rentalservice.repository.ReservaRepository;
import io.grpc.Status;
import io.grpc.StatusRuntimeException;
import io.grpc.stub.StreamObserver;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.function.Supplier;

/**
 * Rental Service: crear, cancelar y consultar reservas / historial.
 * No valida clientes ni vehiculos (eso lo orquesta el API Gateway).
 * Las fechas se guardan en UTC.
 */
@Component
public class RentalGrpcService extends RentalServiceGrpc.RentalServiceImplBase {

    private static final Logger log = LoggerFactory.getLogger(RentalGrpcService.class);
    private static final long TOLERANCIA_INICIO_MINUTOS = 5;
    private static final BigDecimal IMPORTE_MAXIMO = new BigDecimal("99999999.99"); // DECIMAL(10,2)

    private final ReservaRepository repo;
    private final TransactionTemplate tx;
    /** Serializa altas para que dos pedidos simultaneos no reserven el mismo auto. */
    private final Object lockAltas = new Object();

    public RentalGrpcService(ReservaRepository repo, PlatformTransactionManager txManager) {
        this.repo = repo;
        this.tx = new TransactionTemplate(txManager);
    }

    // ------------------------------------------------------------------ RPCs

    @Override
    public void createRental(CreateRentalRequest req, StreamObserver<RentalResponse> obs) {
        responder(obs, () -> {
            if (req.getClienteId() <= 0) throw error(Status.INVALID_ARGUMENT, "El cliente es obligatorio");
            if (req.getVehiculoId() <= 0) throw error(Status.INVALID_ARGUMENT, "El vehículo es obligatorio");
            if (req.getPrecioDiarioSnapshotCentavos() <= 0)
                throw error(Status.INVALID_ARGUMENT, "El precio diario debe ser mayor a cero");
            if (!req.hasFechaInicio() || !req.hasFechaFin())
                throw error(Status.INVALID_ARGUMENT, "Las fechas de inicio y fin son obligatorias");

            LocalDateTime inicio = aLocal(req.getFechaInicio());
            LocalDateTime fin = aLocal(req.getFechaFin());

            if (inicio.isBefore(ahora().minusMinutes(TOLERANCIA_INICIO_MINUTOS)))
                throw error(Status.INVALID_ARGUMENT,
                        "La fecha de inicio debe ser futura respecto a la hora actual");
            if (!fin.isAfter(inicio))
                throw error(Status.INVALID_ARGUMENT,
                        "La fecha de fin debe ser posterior a la fecha de inicio");

            // Dias = duracion redondeada hacia arriba, minimo 1 (misma regla del Hito 1)
            long minutos = Duration.between(inicio, fin).toMinutes();
            long dias = Math.max(1, (long) Math.ceil(minutos / (60.0 * 24.0)));
            BigDecimal precio = BigDecimal.valueOf(req.getPrecioDiarioSnapshotCentavos(), 2);
            BigDecimal importe = precio.multiply(BigDecimal.valueOf(dias));
            if (importe.compareTo(IMPORTE_MAXIMO) > 0)
                throw error(Status.INVALID_ARGUMENT, "El importe total excede el máximo permitido");

            synchronized (lockAltas) {
                return tx.execute(status -> {
                    if (repo.existeSolapamiento(req.getVehiculoId(), EstadoReserva.CONFIRMADA, inicio, fin))
                        throw error(Status.ALREADY_EXISTS,
                                "El vehículo no está disponible durante el período solicitado");
                    Reserva r = new Reserva();
                    r.setClienteId(req.getClienteId());
                    r.setVehiculoId(req.getVehiculoId());
                    r.setFechaInicio(inicio);
                    r.setFechaFin(fin);
                    r.setPrecioDiarioSnapshot(precio);
                    r.setImporteTotal(importe);
                    r.setEstado(EstadoReserva.CONFIRMADA);
                    return RentalResponse.newBuilder().setRental(aProto(repo.save(r))).build();
                });
            }
        });
    }

    @Override
    public void cancelRental(CancelRentalRequest req, StreamObserver<RentalResponse> obs) {
        responder(obs, () -> tx.execute(status -> {
            Reserva r = repo.findById(req.getId())
                    .orElseThrow(() -> error(Status.NOT_FOUND, "La reserva no existe"));
            if (r.getEstado() != EstadoReserva.CONFIRMADA)
                throw error(Status.FAILED_PRECONDITION,
                        "No se puede cancelar una reserva en estado " + r.getEstado().name());
            if (!r.getFechaInicio().isAfter(ahora()))
                throw error(Status.FAILED_PRECONDITION,
                        "No se puede cancelar una reserva cuyo período ya comenzó");
            r.setEstado(EstadoReserva.CANCELADA);
            return RentalResponse.newBuilder().setRental(aProto(repo.save(r))).build();
        }));
    }

    @Override
    public void getRentalById(GetRentalByIdRequest req, StreamObserver<RentalResponse> obs) {
        responder(obs, () -> {
            Reserva r = repo.findById(req.getId())
                    .orElseThrow(() -> error(Status.NOT_FOUND, "La reserva no existe"));
            return RentalResponse.newBuilder().setRental(aProto(r)).build();
        });
    }

    @Override
    public void listRentalsByCustomer(ListRentalsByCustomerRequest req,
                                      StreamObserver<ListRentalsResponse> obs) {
        responder(obs, () -> {
            if (req.getClienteId() <= 0)
                throw error(Status.INVALID_ARGUMENT, "El cliente es obligatorio");
            List<Reserva> reservas = repo.findByClienteIdOrderByFechaInicioDesc(req.getClienteId());
            ListRentalsResponse.Builder b = ListRentalsResponse.newBuilder();
            reservas.forEach(r -> b.addRentals(aProto(r)));
            return b.build();
        });
    }

    @Override
    public void checkAvailability(CheckAvailabilityRequest req,
                                  StreamObserver<CheckAvailabilityResponse> obs) {
        responder(obs, () -> {
            if (!req.hasFechaInicio() || !req.hasFechaFin())
                throw error(Status.INVALID_ARGUMENT, "Las fechas de inicio y fin son obligatorias");
            LocalDateTime inicio = aLocal(req.getFechaInicio());
            LocalDateTime fin = aLocal(req.getFechaFin());
            if (!fin.isAfter(inicio))
                throw error(Status.INVALID_ARGUMENT,
                        "La fecha de fin debe ser posterior a la fecha de inicio");
            boolean ocupado = repo.existeSolapamiento(
                    req.getVehiculoId(), EstadoReserva.CONFIRMADA, inicio, fin);
            return CheckAvailabilityResponse.newBuilder().setDisponible(!ocupado).build();
        });
    }

    // --------------------------------------------------------------- helpers

    private <T> void responder(StreamObserver<T> obs, Supplier<T> accion) {
        try {
            obs.onNext(accion.get());
            obs.onCompleted();
        } catch (StatusRuntimeException e) {
            obs.onError(e);
        } catch (Exception e) {
            log.error("Error inesperado en Rental Service", e);
            obs.onError(Status.INTERNAL.withDescription("Error interno del servicio de alquileres")
                    .asRuntimeException());
        }
    }

    private static StatusRuntimeException error(Status status, String mensaje) {
        return status.withDescription(mensaje).asRuntimeException();
    }

    private static LocalDateTime ahora() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }

    private static LocalDateTime aLocal(Timestamp ts) {
        return LocalDateTime.ofEpochSecond(ts.getSeconds(), 0, ZoneOffset.UTC);
    }

    private static Timestamp aTimestamp(LocalDateTime f) {
        return Timestamp.newBuilder().setSeconds(f.toEpochSecond(ZoneOffset.UTC)).build();
    }

    private static long aCentavos(BigDecimal monto) {
        return monto.movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact();
    }

    private static Rental aProto(Reserva r) {
        return Rental.newBuilder()
                .setId(r.getId())
                .setClienteId(r.getClienteId())
                .setVehiculoId(r.getVehiculoId())
                .setFechaInicio(aTimestamp(r.getFechaInicio()))
                .setFechaFin(aTimestamp(r.getFechaFin()))
                .setPrecioDiarioSnapshotCentavos(aCentavos(r.getPrecioDiarioSnapshot()))
                .setImporteTotalCentavos(aCentavos(r.getImporteTotal()))
                .setEstado(RentalState.valueOf("RENTAL_STATE_" + r.getEstado().name()))
                .build();
    }
}
